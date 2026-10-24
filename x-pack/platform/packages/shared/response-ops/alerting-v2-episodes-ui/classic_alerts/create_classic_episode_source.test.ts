/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STACK_MANAGEMENT_RULES_HOST } from '@kbn/rule-data-utils';
import type { HttpStart } from '@kbn/core-http-browser';
import type { AlertEpisode } from '../queries/episodes_query';
import { createClassicEpisodeSource } from './create_classic_episode_source';

describe('createClassicEpisodeSource', () => {
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

  describe('getRuleTypeIds', () => {
    const episodeWith = (ruleTypeId?: string) =>
      ({ source_action_context: ruleTypeId ? { ruleTypeId } : {} } as AlertEpisode);

    it('collects the distinct rule types of the given rows', () => {
      const source = createClassicEpisodeSource({ ruleTypeIds: ['a', 'b'] });

      expect(
        source.getRuleTypeIds!([
          episodeWith('observability.rules.custom_threshold'),
          episodeWith('observability.rules.custom_threshold'),
          episodeWith('.es-query'),
        ])
      ).toEqual(['observability.rules.custom_threshold', '.es-query']);
    });

    it('ignores rows without a rule type in their context', () => {
      const source = createClassicEpisodeSource({ ruleTypeIds: ['a'] });

      expect(source.getRuleTypeIds!([episodeWith(), {} as AlertEpisode])).toEqual([]);
    });
  });

  describe('fetchSearchFields', () => {
    const makeServices = () => ({
      http: { get: jest.fn().mockResolvedValue({ fields: [] }) } as unknown as HttpStart,
    });

    it('requests fields for every covered rule type by default', async () => {
      const source = createClassicEpisodeSource({ ruleTypeIds: ['a', 'b'] });
      const services = makeServices();

      await source.fetchSearchFields!({ services });

      expect(services.http.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ query: { ruleTypeIds: ['a', 'b'] } })
      );
    });

    it('narrows the request to the given rule types', async () => {
      const source = createClassicEpisodeSource({ ruleTypeIds: ['a', 'b'] });
      const services = makeServices();

      await source.fetchSearchFields!({ services, ruleTypeIds: ['b'] });

      expect(services.http.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ query: { ruleTypeIds: ['b'] } })
      );
    });
  });
});
