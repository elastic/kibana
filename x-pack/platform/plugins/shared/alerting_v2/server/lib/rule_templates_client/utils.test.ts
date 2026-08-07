/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import {
  buildEngineV2Filter,
  buildFindRuleTemplatesFilter,
  mapSortField,
  RULE_TEMPLATE_TAGS_FIELD,
  transformRuleTemplateSoAttributesToApiResponse,
} from './utils';

const validTemplateAttributes = {
  engine: 'v2' as const,
  rule: {
    kind: 'alert' as const,
    metadata: {
      name: 'Pod CrashLoopBackOff',
      tags: ['Kubernetes'],
    },
    schedule: {
      every: '1m',
      lookback: '15m',
    },
    state_transition: {
      pending_count: 3,
    },
    recovery_strategy: 'no_breach' as const,
    query: {
      format: 'composed' as const,
      base: 'TS metrics-* | STATS restarts = MAX(k8s.container.restarts) BY k8s.pod.name',
      breach: {
        segment: 'WHERE restarts > 0 | LIMIT 50',
      },
    },
    grouping: {
      fields: ['k8s.pod.name'],
    },
    time_field: '@timestamp',
  },
};

describe('rule templates client utils', () => {
  describe('buildEngineV2Filter', () => {
    it('filters on engine v2', () => {
      expect(buildEngineV2Filter()).toEqual(
        nodeBuilder.is(`${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.engine`, 'v2')
      );
    });
  });

  describe('buildFindRuleTemplatesFilter', () => {
    it('returns only the engine filter when tags are omitted', () => {
      expect(buildFindRuleTemplatesFilter()).toEqual(buildEngineV2Filter());
    });

    it('ANDs a single tag filter with the engine filter', () => {
      expect(buildFindRuleTemplatesFilter(['Kubernetes'])).toEqual(
        nodeBuilder.and([
          buildEngineV2Filter(),
          nodeBuilder.is(RULE_TEMPLATE_TAGS_FIELD, 'Kubernetes'),
        ])
      );
    });

    it('ORs multiple tags under the engine filter', () => {
      expect(buildFindRuleTemplatesFilter(['a', 'b'])).toEqual(
        nodeBuilder.and([
          buildEngineV2Filter(),
          nodeBuilder.or([
            nodeBuilder.is(RULE_TEMPLATE_TAGS_FIELD, 'a'),
            nodeBuilder.is(RULE_TEMPLATE_TAGS_FIELD, 'b'),
          ]),
        ])
      );
    });
  });

  describe('mapSortField', () => {
    it('defaults to the name keyword field', () => {
      expect(mapSortField()).toBe('rule.metadata.name.keyword');
    });

    it('maps public sort fields onto indexed attribute paths', () => {
      expect(mapSortField('name')).toBe('rule.metadata.name.keyword');
      expect(mapSortField('tags')).toBe('rule.metadata.tags');
    });
  });

  describe('transformRuleTemplateSoAttributesToApiResponse', () => {
    it('parses attributes and attaches the saved object id', () => {
      expect(
        transformRuleTemplateSoAttributesToApiResponse('template-1', validTemplateAttributes)
      ).toEqual({
        id: 'template-1',
        ...validTemplateAttributes,
      });
    });

    it('throws when attributes are not valid v2 template data', () => {
      expect(() =>
        transformRuleTemplateSoAttributesToApiResponse('template-1', {
          engine: 'v1',
          name: 'classic',
        })
      ).toThrow();
    });
  });
});
