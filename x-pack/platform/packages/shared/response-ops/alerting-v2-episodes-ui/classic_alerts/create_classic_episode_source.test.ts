/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import {
  OBSERVABILITY_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
  STACK_MANAGEMENT_RULES_HOST,
} from '@kbn/rule-data-utils';
import { createClassicEpisodeSource } from './create_classic_episode_source';

describe('createClassicEpisodeSource', () => {
  describe('getWriteCapability', () => {
    const getWriteCapability = (
      capabilities: Record<string, Record<string, boolean>>
    ): boolean | undefined =>
      createClassicEpisodeSource({ ruleTypeIds: ['test-type'] }).getWriteCapability?.({
        navLinks: {},
        management: {},
        catalogue: {},
        ...capabilities,
      } as ApplicationStart['capabilities']);

    it.each([
      ['Observability alerts write', { [OBSERVABILITY_ALERTS_FEATURE_ID]: { write: true } }],
      ['Stack alerts write', { [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } }],
    ])('grants write with %s', (_name, capabilities) => {
      expect(getWriteCapability(capabilities)).toBe(true);
    });

    it('withholds write when neither feature grants it', () => {
      expect(
        getWriteCapability({
          [OBSERVABILITY_ALERTS_FEATURE_ID]: { show: true, write: false },
          [STACK_ALERTS_ONLY_FEATURE_ID]: { show: true, write: false },
        })
      ).toBe(false);
    });

    it('withholds write when neither feature is granted at all', () => {
      expect(getWriteCapability({})).toBe(false);
    });
  });

  describe('getRuleDetailsHref', () => {
    it('uses the default Stack Management host when no host is provided', () => {
      const source = createClassicEpisodeSource({ ruleTypeIds: ['test-type'] });
      expect(source.getRuleDetailsHref!('rule-1')).toBe(
        `/app/${STACK_MANAGEMENT_RULES_HOST.app}${STACK_MANAGEMENT_RULES_HOST.pathPrefix}/rule/rule-1`
      );
    });

    it('uses appBasePath when the host provides one', () => {
      const source = createClassicEpisodeSource({
        ruleTypeIds: ['test-type'],
        host: {
          app: 'observabilityAlerting',
          pathPrefix: '/rules/v1',
          appBasePath: '/app/observability/alerting',
        },
      });
      expect(source.getRuleDetailsHref!('rule-1')).toBe(
        '/app/observability/alerting/rules/v1/rule/rule-1'
      );
    });

    it('falls back to /app/{appId} when appBasePath is omitted', () => {
      const source = createClassicEpisodeSource({
        ruleTypeIds: ['test-type'],
        host: { app: 'myApp', pathPrefix: '/rules' },
      });
      expect(source.getRuleDetailsHref!('rule-1')).toBe('/app/myApp/rules/rule/rule-1');
    });
  });
});
