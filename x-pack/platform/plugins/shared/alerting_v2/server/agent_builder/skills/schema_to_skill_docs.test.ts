/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateRuleSchemaDoc,
  generateRuleOperationsDoc,
  generateActionPolicySchemaDoc,
} from './schema_to_skill_docs';

describe('schema_to_skill_docs', () => {
  describe('generateRuleSchemaDoc', () => {
    it('matches the snapshot', () => {
      expect(generateRuleSchemaDoc()).toMatchSnapshot();
    });

    it('includes key field names from the schema', () => {
      const doc = generateRuleSchemaDoc();
      expect(doc).toContain('`kind`');
      expect(doc).toContain('`metadata`');
      expect(doc).toContain('`schedule`');
      expect(doc).toContain('`query`');
      expect(doc).toContain('`recovery_strategy`');
      expect(doc).toContain('`no_data_strategy`');
      expect(doc).toContain('`state_transition`');
    });

    it('does not contain stale field names', () => {
      const doc = generateRuleSchemaDoc();
      expect(doc).not.toContain('consecutive_breaches');
      expect(doc).not.toContain('evaluation');
      expect(doc).not.toContain('recovery_policy');
    });
  });

  describe('generateRuleOperationsDoc', () => {
    it('matches the snapshot', () => {
      expect(generateRuleOperationsDoc()).toMatchSnapshot();
    });

    it('includes all operation types', () => {
      const doc = generateRuleOperationsDoc();
      expect(doc).toContain('set_metadata');
      expect(doc).toContain('set_kind');
      expect(doc).toContain('set_schedule');
      expect(doc).toContain('set_query');
      expect(doc).toContain('set_grouping');
      expect(doc).toContain('set_state_transition');
      expect(doc).toContain('validate');
    });

    it('includes pending_count and recovering_count fields', () => {
      const doc = generateRuleOperationsDoc();
      expect(doc).toContain('pending_count');
      expect(doc).toContain('recovering_count');
    });
  });

  describe('generateActionPolicySchemaDoc', () => {
    it('matches the snapshot', () => {
      expect(generateActionPolicySchemaDoc()).toMatchSnapshot();
    });

    it('includes key field names', () => {
      const doc = generateActionPolicySchemaDoc();
      expect(doc).toContain('`name`');
      expect(doc).toContain('`destinations`');
      expect(doc).toContain('`matcher`');
      expect(doc).toContain('`groupingMode`');
      expect(doc).toContain('`throttle`');
    });
  });

  /**
   * Every schema carrying a `.meta({ id })` — added so the OAS emits named
   * components — is hoisted into `definitions` by `z.toJSONSchema` and replaced
   * by a `$ref`. These docs are read by an LLM, so the pointers have to be
   * expanded back into real types rather than rendered as `unknown`.
   */
  describe('schemas extracted into `definitions`', () => {
    const allDocs = () => [
      generateRuleSchemaDoc(),
      generateRuleOperationsDoc(),
      generateActionPolicySchemaDoc(),
    ];

    it('never leaves an unresolved pointer or type in any doc', () => {
      for (const doc of allDocs()) {
        expect(doc).not.toContain('$ref');
        expect(doc).not.toContain('| unknown');
        expect(doc).not.toContain('unknown[]');
      }
    });

    it('renders referenced object schemas with their type and description', () => {
      const doc = generateRuleSchemaDoc();
      expect(doc).toContain('| `metadata` | object | required | Rule metadata. |');
      expect(doc).toContain(
        '| `schedule` | object | required | Execution schedule configuration. |'
      );
    });

    it('renders a referenced discriminated union as its variants', () => {
      expect(generateRuleSchemaDoc()).toContain(
        '| `query` | { format: "composed", ... } | { format: "standalone", ... } | required | Detection query configuration. |'
      );
      expect(generateRuleOperationsDoc()).toContain(
        '| `query` | { format: "composed", ... } | { format: "standalone", ... } | required | Detection query configuration. |'
      );
    });

    it('expands the variant tables of a referenced union', () => {
      const doc = generateRuleSchemaDoc();
      expect(doc).toContain('## Query Formats');
      expect(doc).toContain('#### `format: "composed"`');
      expect(doc).toContain('#### `format: "standalone"`');
      expect(doc).toContain(
        '| `base` | string | required | Base ES|QL query. Time filters are applied automatically via the lookback window. (min length: 1, max length: 10000) |'
      );
    });

    it('renders arrays whose items are referenced schemas', () => {
      expect(generateRuleSchemaDoc()).toContain(
        '| `artifacts` | object[] | optional |  (max items: 100) |'
      );
      expect(generateActionPolicySchemaDoc()).toContain(
        '| `destinations` | { type: "workflow", ... }[] | required | The list of destinations. At least one is required. (min items: 1, max items: 10) |'
      );
    });

    it('merges a reference with the sibling keys draft-7 moves into `allOf`', () => {
      expect(generateRuleSchemaDoc()).toContain(
        '| `grouping` | object | optional | Grouping configuration. |'
      );
      expect(generateActionPolicySchemaDoc()).toContain(
        '| `throttle` | object | optional | The throttle configuration for notifications. |'
      );
    });

    it('keeps the referencing field description when the definition also has one', () => {
      const doc = generateActionPolicySchemaDoc();
      expect(doc).toContain(
        '| `groupingMode` | "per_episode" | "all" | "per_field" | optional | The grouping mode for alert notifications. (enum: per_episode | all | per_field) |'
      );
      expect(doc).not.toContain('per_episode groups by episode lifecycle');
    });
  });
});
