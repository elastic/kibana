/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import CONTEXT_ENGINE_DOCUMENT_TEMPLATE from './document_template.yaml.text';
import CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE from './index_metadata_template.yaml.text';
import CONTEXT_ENGINE_UNIT_PROFILE_TEMPLATE from './unit_profile_template.yaml.text';
import { WorkflowSchemaBase } from '@kbn/workflows/spec/schema';
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
  maxUnits: 25,
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

      expect(yaml).toContain('foreach: "{{ consts.sources | json }}"');
      expect(yaml).not.toMatch(/consts\.source_index|consts\.category_field/);
      expect(yaml).toContain('path: /{{ steps.source_context.output.index }}/_mapping');
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

  it('produces valid YAML for the unit profile', () => {
    const yaml = renderUnitProfileTemplate(unitValues);

    expect(() => parse(yaml)).not.toThrow();
  });

  it('divides the KI budget by the claims per document for a per-claim variant', () => {
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
  ])('renders %s into a definition the workflow schema accepts', (_template, render) => {
    const parsed = WorkflowSchemaBase.safeParse(parse(render()));

    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues, null, 2));
    }
  });

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
