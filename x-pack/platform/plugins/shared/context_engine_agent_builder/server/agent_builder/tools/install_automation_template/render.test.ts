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
  renderMemoryDistillationTemplate,
  renderMemoryEnrichmentTemplate,
  renderMemoryMaintenanceTemplate,
  renderMemoryPromotionTemplate,
  renderTargetedKiWriterTemplate,
  renderTraceMemoryExtractionTemplate,
  renderUnitProfileTemplate,
} from './render';

const memoryPromotionValues = {
  aiIndexId: 'support',
  automationName: 'support-memory-promotion',
  agentIds: ['elastic-ai-agent'],
  batchSize: 50,
  interval: '1h',
};

const traceMemoryExtractionValues = {
  aiIndexId: 'support',
  automationName: 'support-trace-memory',
  lookbackHours: 24,
  maxRows: 50,
  interval: '1d',
};

const memoryDistillationValues = {
  aiIndexId: 'support',
  automationName: 'support-dreaming',
  maxMemories: 200,
  purgeAfterDays: 30,
  interval: '1d',
};

const memoryEnrichmentValues = {
  aiIndexId: 'support',
  automationName: 'support-enrichment',
  memoryTypes: 'memory.entity.*',
  minNewAccesses: 3,
  minDaysBetweenEnrichments: 7,
  maxEnrichments: 5,
  agentId: 'elastic-ai-agent',
  interval: '1d',
};

const memoryMaintenanceValues = {
  aiIndexId: 'elastic',
  agentIds: [],
  unusedDays: 14,
  maxOwners: 20,
  maxMemories: 50,
  interval: '1d',
};

describe('memory templates', () => {
  it('fills the promotion consts, tag and concurrency key', () => {
    const definition = parse(renderMemoryPromotionTemplate(memoryPromotionValues));

    expect(definition.consts).toMatchObject({
      ai_index_id: 'support',
      automation_name: 'support-memory-promotion',
      agent_ids: ['elastic-ai-agent'],
      batch_size: 50,
    });
    expect(definition.tags).toContain(AUTOMATION_TEMPLATE_TAGS.memory_promotion);
    expect(definition.settings.concurrency).toMatchObject({ strategy: 'drop', max: 1 });
    // Rendered from the consts when a run starts.
    expect(
      createWorkflowLiquidEngine().parseAndRenderSync(definition.settings.concurrency.key, {
        consts: definition.consts,
      })
    ).toBe('memory-promotion-support');
    expect(definition.triggers).toContainEqual({ type: 'scheduled', with: { every: '1h' } });
  });

  it('renders an empty agent list as every agent', () => {
    const definition = parse(
      renderMemoryPromotionTemplate({ ...memoryPromotionValues, agentIds: [] })
    );

    expect(definition.consts.agent_ids).toEqual([]);
  });

  describe('model and instructions are consts, so they can be configured after install', () => {
    const findPromptStep = (steps: TemplateStep[]): TemplateStep | undefined => {
      for (const step of steps) {
        if (step.type === 'ai.prompt') {
          return step;
        }
        const nested = findPromptStep([...(step.steps ?? []), ...(step.else ?? [])]);
        if (nested) {
          return nested;
        }
      }
      return undefined;
    };
    const liquid = createWorkflowLiquidEngine();

    it.each([
      ['memory_promotion', () => renderMemoryPromotionTemplate(memoryPromotionValues)],
      [
        'trace_memory_extraction',
        () => renderTraceMemoryExtractionTemplate(traceMemoryExtractionValues),
      ],
      ['memory_distillation', () => renderMemoryDistillationTemplate(memoryDistillationValues)],
      ['memory_maintenance', () => renderMemoryMaintenanceTemplate(memoryMaintenanceValues)],
    ])('%s puts its instructions in the prompt and defaults the model', (_template, render) => {
      const definition = parse(render());
      const step = findPromptStep(definition.steps) as TemplateStep & Record<string, string>;
      const { consts } = definition;

      expect(consts.connector_id).toBe('');
      expect(consts.instructions.length).toBeGreaterThan(100);
      expect(step.with).toHaveProperty(
        'prompt',
        expect.stringContaining('{{ consts.instructions }}')
      );

      const renderConfig = (connectorId: string) =>
        ['connector-id', 'connector-id-by-feature'].map((key) =>
          liquid.parseAndRenderSync(step[key], { consts: { ...consts, connector_id: connectorId } })
        );
      // Empty uses the Context Engine model; a connector id replaces it.
      expect(renderConfig('')).toEqual(['', 'context_engine_prompt']);
      expect(renderConfig('my-connector')).toEqual(['my-connector', '']);
    });
  });

  it('fills the maintenance consts and windows each run from the last successful one', () => {
    const definition = parse(renderMemoryMaintenanceTemplate(memoryMaintenanceValues));

    expect(definition.consts).toMatchObject({
      agent_ids: [],
      unused_days: 14,
      first_run_hours: 720,
      max_owners: 20,
      max_memories: 50,
    });
    expect(definition.tags).toContain(AUTOMATION_TEMPLATE_TAGS.memory_maintenance);
    expect(definition.settings.concurrency.key).toBe('memory-maintenance-elastic');
    expect(definition.steps.map(({ type }: { type: string }) => type)).toEqual([
      'context-engine.getLastRun',
      'ai.memory.short_term.decay',
      'ai.memory.short_term.list_by_owner',
      'foreach',
    ]);
  });

  describe('memory enrichment', () => {
    const definition = parse(renderMemoryEnrichmentTemplate(memoryEnrichmentValues));
    const liquid = createWorkflowLiquidEngine();
    const stepNamed = (name: string) =>
      allSteps(definition.steps).find((step) => step.name === name) as TemplateStep &
        Record<string, unknown>;

    it('fills the thresholds that decide how often a memory is enriched', () => {
      expect(definition.consts).toMatchObject({
        ai_index_id: 'support',
        memory_types: 'memory.entity.*',
        min_new_accesses: 3,
        min_days_between_enrichments: 7,
        max_enrichments: 5,
        agent_id: 'elastic-ai-agent',
        connector_id: '',
      });
      expect(definition.tags).toContain(AUTOMATION_TEMPLATE_TAGS.memory_enrichment);
      expect(definition.settings.concurrency.key).toBe(
        'memory-enrichment-{{ consts.ai_index_id }}'
      );
      expect(stepNamed('due')).toMatchObject({
        type: 'context-engine.getKiUsage',
        with: {
          min_new_accesses: '${{ consts.min_new_accesses }}',
          min_days_since_enrichment: '${{ consts.min_days_between_enrichments }}',
          limit: '${{ consts.max_enrichments }}',
        },
      });
    });

    it('passes the memory types to ES|QL as a parameter, not as query text', () => {
      const { with: candidates } = definition.steps.find(
        ({ name }: { name: string }) => name === 'candidates'
      );

      expect(candidates.query).toContain('WHERE type LIKE ?memory_types');
      expect(liquid.parseAndRenderSync(candidates.params.memory_types, definition)).toBe(
        'memory.entity.*'
      );
    });

    it('hands the agent the due memory, its instructions and the sources', () => {
      const memory = { id: 'memory/entity/customer/acme', title: 'Acme' };
      const scope = {
        consts: definition.consts,
        foreach: { item: { ki_id: memory.id, new_accesses: 4 } },
        steps: {
          ai_index: { output: { sources: [{ type: 'connector', value: 'gdrive-1' }] } },
          candidates: { output: { rows: [{ id: 'other', title: 'Other' }, memory] } },
        },
      };
      const memoryJson = liquid.parseAndRenderSync(
        (stepNamed('memory').with as Record<string, string>).memory_json,
        scope
      );
      const research = stepNamed('research') as TemplateStep &
        Record<string, string> & { with: { message: string } };
      const message = liquid.parseAndRenderSync(research.with.message, {
        ...scope,
        steps: { ...scope.steps, memory: { output: { memory_json: memoryJson } } },
      });

      expect(JSON.parse(memoryJson)).toEqual(memory);
      expect(research.type).toBe('ai.agent');
      expect(liquid.parseAndRenderSync(research['agent-id'], scope)).toBe('elastic-ai-agent');
      expect(liquid.parseAndRenderSync(research['connector-id-by-feature'], scope)).toBe(
        'context_engine_prompt'
      );
      expect(message).toContain(definition.consts.instructions.trim());
      expect(message).toContain('"title":"Acme"');
      expect(message).toContain('read 4 times');
      expect(message).toContain('"value":"gdrive-1"');
    });

    it('writes only enriched memories, and records every memory the agent looked at', () => {
      expect(stepNamed('write')).toMatchObject({
        condition: '${{ steps.research.output.structured_output.enriched == true }}',
        steps: [{ type: 'context-engine.updateKi' }],
      });
      expect(stepNamed('researched')).toMatchObject({
        condition: '${{ steps.research.output.structured_output.enriched != nil }}',
        steps: [{ type: 'context-engine.recordKiEnrichment' }],
      });
    });

    it('rejects memory types outside long-term memory', () => {
      expect(() =>
        renderMemoryEnrichmentTemplate({ ...memoryEnrichmentValues, memoryTypes: 'constraint' })
      ).toThrow(/memory\.\* type/);
    });
  });

  it('rejects a malformed schedule interval', () => {
    expect(() =>
      renderMemoryDistillationTemplate({ ...memoryDistillationValues, interval: '1 day' })
    ).toThrow(/number of minutes, hours or days/);
  });

  it('keys concurrency on the AI index id const, so an odd id stays inside its quoted value', () => {
    const definition = parse(
      renderTraceMemoryExtractionTemplate({
        ...traceMemoryExtractionValues,
        aiIndexId: 'support"\nkey: x',
      })
    );

    expect(definition.consts.ai_index_id).toBe('support"\nkey: x');
    expect(definition.settings.concurrency.key).toBe(
      'trace-memory-extraction-{{ consts.ai_index_id }}'
    );
  });

  it('reads every trace source since the last successful run', () => {
    const definition = parse(renderTraceMemoryExtractionTemplate(traceMemoryExtractionValues));
    const query = createWorkflowLiquidEngine().parseAndRenderSync(
      findStep(definition.steps, 'read_traces')?.with?.query ?? '',
      {
        consts: definition.consts,
        steps: {
          last_run: { output: { hours_since: 7 } },
          trace_source: { output: { query: 'FROM traces-agent_builder.otel-default' } },
        },
      }
    );

    expect(query).toBe('FROM traces-agent_builder.otel-default\n| SORT @timestamp DESC\n');
    // The window is applied where the query is built, before any per-trace aggregation.
    expect(findStep(definition.steps, 'ai_index')).toMatchObject({
      type: 'context-engine.getAiIndex',
      with: { traces_since_hours: '${{ steps.last_run.output.hours_since }}' },
    });
    expect(definition.steps.map(({ name }: { name: string }) => name).slice(0, 2)).toEqual([
      'last_run',
      'ai_index',
    ]);
    // The first run reads lookback_hours; no run reads more than a week.
    expect(findStep(definition.steps, 'last_run')).toMatchObject({
      type: 'context-engine.getLastRun',
      with: {
        default_hours: '${{ consts.lookback_hours }}',
        max_hours: '${{ consts.max_lookback_hours }}',
      },
    });
    expect(definition.consts).toMatchObject({ lookback_hours: 24, max_lookback_hours: 168 });
  });

  it('reads an Agent Builder trace source as the chat turns of each agent run', () => {
    const definition = parse(renderTraceMemoryExtractionTemplate(traceMemoryExtractionValues));
    const liquid = createWorkflowLiquidEngine();
    const scope = {
      consts: definition.consts,
      steps: {
        last_run: { output: { hours_since: 7 } },
        trace_source: {
          output: {
            type: 'elastic_agent',
            value: 'elastic-ai-agent',
            query: 'FROM traces-agent_builder.otel-default',
          },
        },
        read_traces: { output: { rows: [] } },
        existing_memory: { output: { rows: [] } },
      },
    };
    const query = liquid.parseAndRenderSync(
      findStep(definition.steps, 'read_traces')?.with?.query ?? '',
      scope
    );
    const extract = findStep(definition.steps, 'extract') as TemplateStep & {
      with: { prompt: string };
    };

    expect(query.split('\n')).toEqual([
      'FROM traces-agent_builder.otel-default',
      '| INLINE STATS agent_span_ids = VALUES(span_id) WHERE name LIKE "invoke_agent *", run_started = MIN(@timestamp) BY trace_id',
      '| WHERE name LIKE "chat *" AND MV_CONTAINS(agent_span_ids, parent_span_id)',
      '| WHERE (attributes.gen_ai.input.messages IS NOT NULL AND attributes.gen_ai.input.messages != "[]") OR attributes.gen_ai.output.messages IS NOT NULL',
      '| SORT run_started DESC, @timestamp ASC',
      '| KEEP trace_id, @timestamp, attributes.gen_ai.input.messages, attributes.gen_ai.output.messages',
      '',
    ]);
    expect(liquid.parseAndRenderSync(extract.with.prompt, scope)).toContain(
      'Each row is one model turn of an agent run'
    );
  });
});

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
  with?: { query?: string; verifiers?: string[]; unit_escaped?: string };
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

  it('checks that the document title and body fields exist before reading any document', () => {
    const definition = parse(renderDocumentOrchestrationTemplate(documentValues));
    const query = createWorkflowLiquidEngine().parseAndRenderSync(
      findStep(definition.steps, 'check_fields')?.with?.query ?? '',
      { consts: definition.consts }
    );

    expect(query).toBe('FROM loyalty-docs\n| KEEP `title`, `body`\n| LIMIT 0\n');
  });

  describe('document batches', () => {
    it('discovers ids only', () => {
      const query = renderUnitQuery(
        renderDocumentOrchestrationTemplate(documentValues),
        'discover_documents'
      );

      expect(query).toMatch(/\| KEEP _id\s*$/);
    });

    it('fetches title and body for the batch ids', () => {
      const definition = parse(renderDocumentOrchestrationTemplate(documentValues));
      const query = createWorkflowLiquidEngine().parseAndRenderSync(
        findStep(definition.steps, 'fetch_documents')?.with?.query ?? '',
        { consts: definition.consts, foreach: { item: [['a'], ['b"c'], ['d\\e'], ['f\ng\rh']] } }
      );

      expect(query).toContain('| WHERE _id IN ("a", "b\\"c", "d\\\\e", "f\\ng\\rh")');
      expect(query).toContain('| EVAL body = SUBSTRING(`body`, 1, 12000)');
      expect(query).toContain('| KEEP _id, `title`, body');
    });

    it('applies the corpus filter to discovery and to the batch fetch', () => {
      const definition = parse(
        renderDocumentOrchestrationTemplate({
          ...documentValues,
          corpusFilter: 'WHERE status == "published"',
        })
      );

      for (const step of ['discover_documents', 'fetch_documents']) {
        const query = createWorkflowLiquidEngine().parseAndRenderSync(
          findStep(definition.steps, step)?.with?.query ?? '',
          { consts: definition.consts, inputs: {}, foreach: { item: [['a']] } }
        );
        expect(query).toContain('| WHERE status == "published"');
      }
    });
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

    it('escapes the unit key as an ES|QL string literal', () => {
      const definition = parse(renderUnitProfileTemplate(unitValues));
      const unitEscaped = createWorkflowLiquidEngine().parseAndRenderSync(
        findStep(definition.steps, 'unit_context')?.with?.unit_escaped ?? '',
        { foreach: { item: ['a"b\\c\nd\re'] } }
      );

      expect(unitEscaped).toBe('a\\"b\\\\c\\nd\\re');
    });

    it('matches records whose unit key holds several values, which == leaves out', () => {
      const yaml = renderUnitProfileTemplate(unitValues);

      for (const step of ['unit_totals', 'unit_breakdown']) {
        expect(renderUnitQuery(yaml, step)).toContain('| WHERE MV_CONTAINS(`Province`, "ON")');
      }
      expect(yaml).toContain('`MV_CONTAINS({{ consts.unit_key }}, ?unit)`');
    });

    it('checks that the configured fields exist before reading any unit', () => {
      const query = renderUnitQuery(
        renderUnitProfileTemplate({ ...unitValues, metricFields: ['Points Accumulated'] }),
        'check_fields'
      );

      expect(query).toBe(
        'FROM airline_loyalty_customer_loyalty_history\n| KEEP `Province`, `Enrollment Date`, `Loyalty Card`, `Points Accumulated`\n| LIMIT 0\n'
      );
    });

    it('discovers no unit for an empty key', () => {
      const query = renderUnitQuery(renderUnitProfileTemplate(unitValues), 'discover_units');

      expect(query).toContain('| STATS docs = COUNT(*) BY `Province`\n| WHERE `Province` != ""\n');
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
    ['memory_promotion', () => renderMemoryPromotionTemplate(memoryPromotionValues)],
    [
      'trace_memory_extraction',
      () => renderTraceMemoryExtractionTemplate(traceMemoryExtractionValues),
    ],
    ['memory_distillation', () => renderMemoryDistillationTemplate(memoryDistillationValues)],
    ['memory_maintenance', () => renderMemoryMaintenanceTemplate(memoryMaintenanceValues)],
    ['memory_enrichment', () => renderMemoryEnrichmentTemplate(memoryEnrichmentValues)],
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
