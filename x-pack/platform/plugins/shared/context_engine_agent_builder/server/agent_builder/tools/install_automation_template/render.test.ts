/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import CONTEXT_ENGINE_DOCUMENT_TEMPLATE from './document_template.yaml.text';
import CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE from './index_metadata_template.yaml.text';
import CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE from './unit_profile_template.yaml.text';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowSchema } from '@kbn/workflows/spec/schema';
import { parse } from 'yaml';
import {
  AUTOMATION_TEMPLATE_TAGS,
  renderDocumentOrchestrationTemplate,
  renderIndexMetadataTemplate,
  renderTargetedKiWriterTemplate,
  renderUnitProfileTemplate,
} from './render';

const unitValues = {
  aiIndexId: 'airline-loyalty',
  automationName: 'loyalty-province-profile',
  unitIndex: 'airline_loyalty_customer_loyalty_history',
  unitKey: 'Province',
  activityField: 'Enrollment Date',
  breakdownField: 'Loyalty Card',
  corpusFilter: '',
  metricFields: [] as string[],
  maxUnits: 25,
};

interface TemplateStep {
  name: string;
  type?: string;
  concurrency?: number;
  mode?: string;
  'on-failure'?: object;
  with?: { query?: string; verifiers?: string[] };
  steps?: TemplateStep[];
  else?: TemplateStep[];
}

const allSteps = (steps: readonly TemplateStep[]): TemplateStep[] =>
  steps.flatMap((step) => [step, ...allSteps(step.steps ?? []), ...allSteps(step.else ?? [])]);

const findStep = (steps: TemplateStep[], name: string): TemplateStep | undefined => {
  for (const step of steps) {
    if (step.name === name) {
      return step;
    }
    const nested = step.steps ? findStep(step.steps, name) : undefined;
    if (nested) {
      return nested;
    }
  }
  return undefined;
};

/** Renders one step's ES|QL the way the workflow engine would, for a unit named "ON". */
const renderUnitQuery = (
  yaml: string,
  stepName: string,
  inputs: Record<string, number> = {}
): string => {
  const definition = parse(yaml);
  const query = findStep(definition.steps, stepName)?.with?.query ?? '';
  return createWorkflowLiquidEngine().parseAndRenderSync(query, {
    consts: definition.consts,
    inputs,
    steps: { unit_context: { output: { unit: 'ON', unit_escaped: 'ON' } } },
  });
};

const documentValues = {
  aiIndexId: 'airline-loyalty',
  automationName: 'flight-activity-docs',
  sourceIndex: 'loyalty-docs',
  titleField: 'title',
  bodyField: 'body',
  corpusFilter: '',
  maxDocuments: 50,
  bodyMaxChars: 12000,
};

describe('automation template rendering', () => {
  it('quotes string consts and leaves numbers bare', () => {
    const yaml = renderDocumentOrchestrationTemplate({
      aiIndexId: 'airline-loyalty',
      automationName: 'flight-activity-docs',
      sourceIndex: 'loyalty-docs',
      titleField: 'title',
      bodyField: 'body',
      corpusFilter: 'WHERE title == "O\'Brien"',
      maxDocuments: 50,
      bodyMaxChars: 12000,
    });

    expect(yaml).toContain('ai_index_id: "airline-loyalty"');
    expect(yaml).toContain('corpus_filter: "| WHERE title == \\"O\'Brien\\""');
    expect(yaml).toContain('max_documents: 50');
    expect(yaml).toContain('body_max_chars: 12000');
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.document_orchestration);
    expect(yaml).not.toMatch(/__[A-Z0-9_]+__/);
    expect(yaml).toContain(
      'ki_id: "{{ consts.automation_name }}/{{ steps.document_context.output.doc_id }}"'
    );
  });

  it('keeps a corpus filter that itself contains underscores', () => {
    const yaml = renderDocumentOrchestrationTemplate({
      aiIndexId: 'airline-loyalty',
      automationName: 'flight-activity-docs',
      sourceIndex: 'loyalty-docs',
      titleField: 'title',
      bodyField: 'body',
      corpusFilter: 'WHERE code == "__KEEP__"',
      maxDocuments: 50,
      bodyMaxChars: 12000,
    });

    expect(yaml).toContain('| WHERE code == \\"__KEEP__\\"');
  });

  describe('index metadata', () => {
    const twoSources = {
      aiIndexId: 'airline-loyalty',
      automationName: 'loyalty-index-metadata',
      sources: [
        { index: 'loyalty-docs', categoryField: 'tier' },
        { index: 'flight-activity', categoryField: 'Loyalty Card' },
      ],
    };

    it('writes every source into one sources const', () => {
      const yaml = renderIndexMetadataTemplate(twoSources);

      expect(parse(yaml).consts.sources).toEqual([
        { index: 'loyalty-docs', category_field: 'tier' },
        { index: 'flight-activity', category_field: 'Loyalty Card' },
      ]);
      expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.index_metadata);
      expect(yaml).not.toMatch(/__[A-Z0-9_]+__/);
    });

    it('loops over the sources, reading each one from the loop item rather than a single const', () => {
      const yaml = renderIndexMetadataTemplate(twoSources);

      expect(yaml).toContain(
        'foreach: "{{ consts.sources | chunk: inputs.pilot_size | first | json }}"'
      );
      expect(yaml).not.toMatch(/consts\.source_index|consts\.category_field/);
      expect(yaml).toContain('path: /{{ steps.source_context.output.index }}/_mapping');
    });

    it('profiles five sources at a time, and one failed source does not stop the rest', () => {
      const [loop] = parse(renderIndexMetadataTemplate(twoSources)).steps as TemplateStep[];

      expect(loop).toEqual(
        expect.objectContaining({
          name: 'loop_sources',
          type: 'parallel',
          concurrency: 5,
          mode: 'settled',
        })
      );
    });

    it('verifies on the KI write itself, with no flow control a parallel branch rejects', () => {
      const [loop] = parse(renderIndexMetadataTemplate(twoSources)).steps as TemplateStep[];
      const branch = allSteps(loop.steps ?? []);

      expect(branch.filter((step) => step.type === 'if')).toEqual([]);
      expect(branch.filter((step) => step['on-failure'] !== undefined)).toEqual([]);
      expect(branch.find((step) => step.name === 'create_ki')?.with?.verifiers).toEqual([
        'esql-valid-syntax',
        'esql-valid-runtime',
      ]);
    });

    it('writes one KI per source, keyed by the automation name and the index', () => {
      const yaml = renderIndexMetadataTemplate(twoSources);

      expect(yaml).toContain(
        'ki_id: "{{ consts.automation_name }}/{{ steps.source_context.output.index }}"'
      );
    });

    it('rejects an unsafe identifier in any source', () => {
      expect(() =>
        renderIndexMetadataTemplate({
          ...twoSources,
          sources: [twoSources.sources[0], { index: 'flights', categoryField: 'tier`' }],
        })
      ).toThrow(/categoryField/);
      expect(() =>
        renderIndexMetadataTemplate({
          ...twoSources,
          sources: [{ index: 'flights{{ x }}', categoryField: 'tier' }],
        })
      ).toThrow(/sourceIndex/);
    });

    it('rejects the same index twice, whose KIs would overwrite each other', () => {
      expect(() =>
        renderIndexMetadataTemplate({
          ...twoSources,
          sources: [twoSources.sources[0], { index: 'loyalty-docs', categoryField: 'status' }],
        })
      ).toThrow(/loyalty-docs/);
    });

    it('rejects an empty source list', () => {
      expect(() => renderIndexMetadataTemplate({ ...twoSources, sources: [] })).toThrow(
        /at least one source/
      );
    });
  });

  it('fills the unit profile consts', () => {
    const yaml = renderUnitProfileTemplate(unitValues);

    expect(yaml).toContain('unit_key: "Province"');
    expect(yaml).toContain('activity_field: "Enrollment Date"');
    expect(yaml).toContain('breakdown_field: "Loyalty Card"');
    expect(yaml).toContain('corpus_filter: ""');
    expect(yaml).toContain('max_units: 25');
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.unit_profile);
    expect(yaml).not.toMatch(/__[A-Z0-9_]+__/);
    expect(yaml).toContain('ki_id: "{{ consts.automation_name }}/{{ foreach.item[0] }}"');
  });

  describe('unit profile metrics and filter', () => {
    it('averages each metric field per unit, after the columns the attributes read by position', () => {
      const yaml = renderUnitProfileTemplate({
        ...unitValues,
        metricFields: ['Points Accumulated', 'Dollar Cost Points Redeemed'],
      });

      expect(parse(yaml).consts.metric_fields).toEqual([
        'Points Accumulated',
        'Dollar Cost Points Redeemed',
      ]);
      const query = renderUnitQuery(yaml, 'unit_totals');
      expect(query).toMatch(
        /`last Enrollment Date` = MAX\(`Enrollment Date`\),\s*`avg Points Accumulated` = AVG\(`Points Accumulated`\),\s*`avg Dollar Cost Points Redeemed` = AVG\(`Dollar Cost Points Redeemed`\)\s*$/
      );
      expect(query.indexOf('records = COUNT(*)')).toBeLessThan(query.indexOf('distinct Loyalty'));
    });

    it('leaves the totals query as it was when no metric fields are given', () => {
      const query = renderUnitQuery(renderUnitProfileTemplate(unitValues), 'unit_totals');

      expect(query).toMatch(/`last Enrollment Date` = MAX\(`Enrollment Date`\)\s*$/);
      expect(query).not.toContain('AVG(');
    });

    it('applies the corpus filter to discovery and to every per-unit query', () => {
      const yaml = renderUnitProfileTemplate({
        ...unitValues,
        corpusFilter: 'WHERE `Enrollment Year` >= 2018',
      });

      for (const step of ['discover_units', 'unit_totals', 'unit_breakdown']) {
        expect(renderUnitQuery(yaml, step)).toContain('| WHERE `Enrollment Year` >= 2018');
      }
    });

    it('rejects a metric field that would break out of its backticks', () => {
      expect(() =>
        renderUnitProfileTemplate({ ...unitValues, metricFields: ['Points` | DROP x'] })
      ).toThrow(/metricFields/);
    });
  });

  describe('pilot runs', () => {
    const pilotTemplates = [
      {
        name: 'document',
        yaml: () => renderDocumentOrchestrationTemplate(documentValues),
        step: 'discover_documents',
        budget: documentValues.maxDocuments,
      },
      {
        name: 'unit profile',
        yaml: () => renderUnitProfileTemplate(unitValues),
        step: 'discover_units',
        budget: unitValues.maxUnits,
      },
    ];

    it.each(pilotTemplates)(
      'declares a bounded pilot_size input on the manual trigger of the $name template',
      ({ yaml }) => {
        const [trigger] = parse(yaml()).triggers;

        expect(trigger.type).toBe('manual');
        expect(trigger.inputs.properties.pilot_size).toEqual(
          expect.objectContaining({ type: 'integer', minimum: 1, maximum: 10 })
        );
      }
    );

    it.each(pilotTemplates)(
      'discovers only pilot_size items in a pilot of the $name template',
      ({ yaml, step }) => {
        expect(renderUnitQuery(yaml(), step, { pilot_size: 3 })).toMatch(/\| LIMIT 3\s*(\||$)/);
      }
    );

    it.each(pilotTemplates)(
      'discovers the full budget when the $name template runs without a pilot size',
      ({ yaml, step, budget }) => {
        expect(renderUnitQuery(yaml(), step)).toMatch(new RegExp(`\\| LIMIT ${budget}\\s*(\\||$)`));
      }
    );

    it.each(pilotTemplates)(
      'never lets a pilot of the $name template exceed the budget',
      ({ yaml, step, budget }) => {
        expect(renderUnitQuery(yaml(), step, { pilot_size: budget + 5 })).toMatch(
          new RegExp(`\\| LIMIT ${budget}\\s*(\\||$)`)
        );
      }
    );

    const indexMetadataValues = {
      aiIndexId: 'airline-loyalty',
      automationName: 'loyalty-index-metadata',
      sources: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((index) => ({
        index,
        categoryField: 'tier',
      })),
    };
    const listTemplates = [
      {
        name: 'index metadata',
        yaml: () => renderIndexMetadataTemplate(indexMetadataValues),
        listLength: indexMetadataValues.sources.length,
      },
    ];

    /** Renders the loop's `foreach` the way the engine does, returning the items it fans out over. */
    const loopItems = (yaml: string, inputs: Record<string, number> = {}): unknown[] => {
      const definition = parse(yaml);
      const [loop] = definition.steps;
      return JSON.parse(
        createWorkflowLiquidEngine().parseAndRenderSync(loop.foreach, {
          consts: definition.consts,
          inputs,
        })
      );
    };

    it.each(listTemplates)(
      'declares a bounded pilot_size input on the manual trigger of the $name template',
      ({ yaml }) => {
        const [trigger] = parse(yaml()).triggers;

        expect(trigger.type).toBe('manual');
        expect(trigger.inputs.properties.pilot_size).toEqual(
          expect.objectContaining({ type: 'integer', minimum: 1, maximum: 10 })
        );
      }
    );

    it.each(listTemplates)(
      'loops over only the first pilot_size entries in a pilot of the $name template',
      ({ yaml }) => {
        expect(loopItems(yaml(), { pilot_size: 5 })).toEqual(loopItems(yaml()).slice(0, 5));
      }
    );

    it.each(listTemplates)(
      'loops over every entry when the $name template runs without a pilot size',
      ({ yaml, listLength }) => {
        expect(loopItems(yaml())).toHaveLength(listLength);
      }
    );

    it.each(listTemplates)(
      'loops over every entry when a pilot of the $name template asks for more than there are',
      ({ yaml, listLength }) => {
        expect(loopItems(yaml(), { pilot_size: 10 })).toHaveLength(listLength);
      }
    );

    it('declares no pilot input on the targeted KI writer, which runs without a pilot', () => {
      const [trigger] = parse(
        renderTargetedKiWriterTemplate({ aiIndexId: 'a', kis: '- ki_id: a\n  ki: {}' })
      ).triggers;

      expect(trigger).toEqual({ type: 'manual' });
    });

    it.each([
      ['document', () => renderDocumentOrchestrationTemplate(documentValues)],
      ['unit profile', () => renderUnitProfileTemplate(unitValues)],
      ['index metadata', () => renderIndexMetadataTemplate(indexMetadataValues)],
      [
        'targeted KI writer',
        () => renderTargetedKiWriterTemplate({ aiIndexId: 'a', kis: '- ki_id: a\n  ki: {}' }),
      ],
    ])(
      'runs the %s loop five at a time, as the automations skill says every template loop does',
      (_name, render) => {
        const loops = allSteps(parse(render()).steps).filter((step) => step.type === 'parallel');

        expect(loops).not.toHaveLength(0);
        loops.forEach((loop) => expect(loop.concurrency).toBe(5));
      }
    );

    it('orders documents so a pilot reads the first documents of the full run', () => {
      const query = renderUnitQuery(
        renderDocumentOrchestrationTemplate(documentValues),
        'discover_documents'
      );

      expect(query.indexOf('| SORT _id')).toBeGreaterThan(-1);
      expect(query.indexOf('| SORT _id')).toBeLessThan(query.indexOf('| LIMIT'));
    });
  });

  it('produces valid YAML for the unit profile', () => {
    const yaml = renderUnitProfileTemplate(unitValues);

    expect(() => parse(yaml)).not.toThrow();
  });

  it('tells a per-claim variant, in the template comment, to divide the KI budget by the claims', () => {
    expect(CONTEXT_ENGINE_DOCUMENT_TEMPLATE).not.toMatch(
      /multiplies it by the claims per document/
    );
    expect(CONTEXT_ENGINE_DOCUMENT_TEMPLATE).toMatch(
      /sets it to the budget divided by the claims\s+#\s+per document/
    );
  });

  it('backticks every field identifier so names containing spaces parse', () => {
    expect(CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE).toContain(
      'BY `{{ steps.source_context.output.category_field }}`'
    );
    expect(CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE).toContain(
      'COUNT_DISTINCT(`{{ steps.source_context.output.category_field }}`)'
    );
    expect(CONTEXT_ENGINE_DOCUMENT_TEMPLATE).toContain('{{ consts.body_field }}');
    expect(CONTEXT_ENGINE_DOCUMENT_TEMPLATE).toContain('{{ consts.title_field }}');
    expect(CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE).toContain('{{ consts.unit_key }}');
    expect(CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE).toContain('{{ consts.breakdown_field }}');
  });

  it.each([
    [
      'document_orchestration',
      () =>
        renderDocumentOrchestrationTemplate({
          aiIndexId: 'airline-loyalty',
          automationName: 'flight-activity-docs',
          sourceIndex: 'loyalty-docs',
          titleField: 'title',
          bodyField: 'body',
          corpusFilter: 'WHERE tier == "gold"',
          maxDocuments: 50,
          bodyMaxChars: 12000,
        }),
    ],
    ['unit_profile', () => renderUnitProfileTemplate(unitValues)],
    [
      'unit_profile with metrics and a filter',
      () =>
        renderUnitProfileTemplate({
          ...unitValues,
          corpusFilter: 'WHERE Country == "Canada"',
          metricFields: ['Points Accumulated'],
        }),
    ],
    [
      'index_metadata',
      () =>
        renderIndexMetadataTemplate({
          aiIndexId: 'airline-loyalty',
          automationName: 'loyalty-index-metadata',
          sources: [
            { index: 'loyalty-docs', categoryField: 'tier' },
            { index: 'flight-activity', categoryField: 'Loyalty Card' },
          ],
        }),
    ],
    [
      'targeted_ki_writer',
      () =>
        renderTargetedKiWriterTemplate({
          aiIndexId: 'airline-loyalty',
          kis: '- ki_id: test\n  ki:\n    type: constraint\n    title: "T"\n    content: "c"',
        }),
    ],
  ])(
    'renders %s into a definition the workflow schema accepts and the engine can build',
    (_template, render) => {
      const parsed = WorkflowSchema.safeParse(parse(render()));

      if (!parsed.success) {
        throw new Error(JSON.stringify(parsed.error.issues, null, 2));
      }
      expect(() => convertToWorkflowGraph(parsed.data)).not.toThrow();
    }
  );

  it('rejects an identifier that would break out of its backticks', () => {
    expect(() =>
      renderUnitProfileTemplate({ ...unitValues, unitKey: 'Province` | DROP x | EVAL y="' })
    ).toThrow(/unitKey .* backtick/);
  });

  describe('targeted_ki_writer template', () => {
    const kisYaml = [
      '- ki_id: constraint-foo',
      '  ki:',
      '    type: constraint',
      '    title: "Foo"',
      '    description: "desc"',
      '    content: "content"',
      '    tags:',
      '      - constraint',
      '    references:',
      '      - uri: index://foo',
      '        relation: derived_from',
    ].join('\n');

    it('substitutes __AI_INDEX_ID__ and __KIS__, leaves no unreplaced tokens', () => {
      const yaml = renderTargetedKiWriterTemplate({ aiIndexId: 'my-ai-index', kis: kisYaml });

      expect(yaml).toContain('ai_index_id: "my-ai-index"');
      expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.targeted_ki_writer);
      expect(yaml).toContain('ki_id: constraint-foo');
      expect(yaml).not.toMatch(/__[A-Z0-9_]+__/);
    });

    it('produces valid YAML', () => {
      const yaml = renderTargetedKiWriterTemplate({ aiIndexId: 'my-ai-index', kis: kisYaml });

      expect(() => parse(yaml)).not.toThrow();
    });

    it('rejects an aiIndexId containing a backtick', () => {
      expect(() =>
        renderTargetedKiWriterTemplate({ aiIndexId: 'my-ai`index', kis: kisYaml })
      ).toThrow(/aiIndexId/);
    });
  });
});
