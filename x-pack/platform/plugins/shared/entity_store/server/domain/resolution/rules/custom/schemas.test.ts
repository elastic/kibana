/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_CUSTOM_RULE_ID_LENGTH,
  MAX_CUSTOM_RULE_NAMESPACES,
  MAX_CUSTOM_RULE_EXPRESSION_LENGTH,
} from './constants';
import {
  CustomResolutionRuleCreate,
  CustomResolutionRuleIdParams,
  CustomResolutionRulePreviewRequest,
  CustomResolutionRuleUpdate,
} from './schemas';

const RULE = {
  name: 'Endpoint local users to AD',
  namespaces: ['local', 'active_directory'],
  match_value: 'TO_LOWER(user.name)',
};

describe('custom resolution rule request schemas', () => {
  describe('create', () => {
    it('accepts a rule without the optional fields', () => {
      expect(CustomResolutionRuleCreate.safeParse(RULE).success).toBe(true);
    });

    it('does not accept a null filter', () => {
      expect(CustomResolutionRuleCreate.safeParse({ ...RULE, filter: null }).success).toBe(false);
    });

    it.each([
      ['no namespaces', { namespaces: [] }],
      [
        'too many namespaces',
        {
          namespaces: Array.from({ length: MAX_CUSTOM_RULE_NAMESPACES + 1 }, (_, i) => `ns${i}`),
        },
      ],
      ['an empty match value', { match_value: '' }],
      [
        'an oversized match value',
        { match_value: 'a'.repeat(MAX_CUSTOM_RULE_EXPRESSION_LENGTH + 1) },
      ],
    ])('rejects %s', (_case, override) => {
      expect(CustomResolutionRuleCreate.safeParse({ ...RULE, ...override }).success).toBe(false);
    });
  });

  describe('update', () => {
    it('rejects an empty body', () => {
      expect(CustomResolutionRuleUpdate.safeParse({}).success).toBe(false);
    });

    it('accepts a null filter, which removes it', () => {
      expect(CustomResolutionRuleUpdate.safeParse({ filter: null }).success).toBe(true);
    });

    it('accepts a single field', () => {
      expect(CustomResolutionRuleUpdate.safeParse({ enabled: true }).success).toBe(true);
    });
  });

  describe('preview', () => {
    it('accepts the definition fields', () => {
      const { name, ...definition } = RULE;
      expect(CustomResolutionRulePreviewRequest.safeParse(definition).success).toBe(true);
    });

    it.each([['name'], ['enabled']])('does not take %s', (field) => {
      const { name, ...definition } = RULE;
      const parsed = CustomResolutionRulePreviewRequest.strict().safeParse({
        ...definition,
        [field]: field === 'enabled' ? true : 'x',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('id params', () => {
    it('bounds the id length', () => {
      expect(
        CustomResolutionRuleIdParams.safeParse({ id: 'a'.repeat(MAX_CUSTOM_RULE_ID_LENGTH) })
          .success
      ).toBe(true);
      expect(
        CustomResolutionRuleIdParams.safeParse({ id: 'a'.repeat(MAX_CUSTOM_RULE_ID_LENGTH + 1) })
          .success
      ).toBe(false);
    });
  });
});
