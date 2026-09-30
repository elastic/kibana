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
  });

  it('keeps a corpus filter that itself contains underscores', () => {
    const yaml = renderDocumentOrchestrationTemplate({
      aiIndexId: 'airline-loyalty',
      sourceIndex: 'loyalty-docs',
      titleField: 'title',
      bodyField: 'body',
      corpusFilter: 'WHERE code == "__KEEP__"',
      maxDocuments: 50,
      bodyMaxChars: 12000,
    });

    expect(yaml).toContain('| WHERE code == \\"__KEEP__\\"');
  });

  it('fills the index metadata consts', () => {
    const yaml = renderIndexMetadataTemplate({
      aiIndexId: 'airline-loyalty',
      sourceIndex: 'loyalty-docs',
      categoryField: 'tier',
    });

    expect(yaml).toContain('category_field: "tier"');
    expect(yaml).toContain(AUTOMATION_TEMPLATE_TAGS.index_metadata);
    expect(yaml).not.toMatch(/__[A-Z0-9_]+__/);
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
  });

  it('produces valid YAML for the unit profile', () => {
    const yaml = renderUnitProfileTemplate(unitValues);

    expect(() => parse(yaml)).not.toThrow();
  });

  it('backticks every field identifier so names containing spaces parse', () => {
    expect(CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE).toContain('BY `{{ consts.category_field }}`');
    expect(CONTEXT_ENGINE_INDEX_METADATA_TEMPLATE).toContain(
      'COUNT_DISTINCT(`{{ consts.category_field }}`)'
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
          sourceIndex: 'loyalty-docs',
          categoryField: 'tier',
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
    expect(() =>
      renderIndexMetadataTemplate({
        aiIndexId: 'airline-loyalty',
        sourceIndex: 'loyalty-docs',
        categoryField: 'tier`',
      })
    ).toThrow(/categoryField/);
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
