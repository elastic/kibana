/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { badRequest } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import {
  deprovisionRuleOnRules,
  provisionRuleOnRules,
  ruleOnRulePlanSchema,
} from '../../../../lib/sig_events/rule_on_rule';
import { RuleOnRuleValidationError } from '../../../../lib/sig_events/rule_on_rule/validate_rule_on_rule_esql';
import {
  fetchDiscoveryChangepointsInWindow,
  formatDiscoveryChangepointsForInvestigator,
} from '../../../../lib/sig_events/discovery_v2/fetch_changepoints_in_window';

const baseRuleSnapshotSchema = z.object({
  ruleId: z.string(),
  spaceId: z.string(),
  name: z.string(),
  kind: z.enum(['alert', 'signal']),
  query: z.string(),
  tags: z.array(z.string()),
  enabled: z.boolean().optional(),
});

export const provisionRuleOnRuleRoute = createServerRoute({
  endpoint: 'POST /internal/streams/sig_events/rule_on_rule/_provision',
  options: {
    access: 'internal',
    summary: 'Provision rule-on-rule children for a base signal rule',
    description:
      'Upserts one or more rule-on-rule signal rules from an LLM planner output and base rule snapshot.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      baseRule: baseRuleSnapshotSchema,
      plan: ruleOnRulePlanSchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { baseRule, plan } = params.body;
    const { getAlertingV2RulesClient, scopedClusterClient } = await getScopedClients({
      request,
    });

    const rulesClient = await getAlertingV2RulesClient();
    if (!rulesClient) {
      throw badRequest('Alerting v2 is not available');
    }

    try {
      return await provisionRuleOnRules({
        baseRule,
        plan,
        rulesClient,
        esClient: scopedClusterClient,
      });
    } catch (error) {
      if (error instanceof RuleOnRuleValidationError) {
        throw badRequest(error.message);
      }
      throw error;
    }
  },
});

export const deprovisionRuleOnRuleRoute = createServerRoute({
  endpoint: 'POST /internal/streams/sig_events/rule_on_rule/_deprovision',
  options: {
    access: 'internal',
    summary: 'Deprovision rule-on-rule children for a deleted base rule',
    description: 'Deletes all system-managed rule-on-rule children for a monitored base rule id.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      monitoredRuleId: z.string(),
      knownChildRuleIds: z.array(z.string()).optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { monitoredRuleId, knownChildRuleIds } = params.body;
    const { getAlertingV2RulesClient } = await getScopedClients({ request });

    const rulesClient = await getAlertingV2RulesClient();
    if (!rulesClient) {
      throw badRequest('Alerting v2 is not available');
    }

    return deprovisionRuleOnRules({
      monitoredRuleId,
      rulesClient,
      knownChildRuleIds,
    });
  },
});

export const fetchDiscoveryChangepointsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/sig_events/discovery_v2/_fetch_changepoints',
  options: {
    access: 'internal',
    summary: 'Fetch rule-on-rule changepoints in a time window',
    description:
      'Source-of-truth fetch for the v2 Discovery workflow after the debounce window. Returns changepoint signal events from .rule-events.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      lookback: z.string().default('now-35s'),
      spaceId: z.string().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { lookback } = params.body;
    const { scopedClusterClient, getAlertingV2RulesClient } = await getScopedClients({ request });

    const rulesClient = await getAlertingV2RulesClient();
    if (!rulesClient) {
      throw badRequest('Alerting v2 is not available');
    }

    const result = await fetchDiscoveryChangepointsInWindow({
      esClient: scopedClusterClient,
      rulesClient,
      lookback,
    });

    return {
      ...result,
      detections: formatDiscoveryChangepointsForInvestigator(result.candidates),
    };
  },
});

export const internalSigEventsRuleOnRuleRoutes = {
  ...provisionRuleOnRuleRoute,
  ...deprovisionRuleOnRuleRoute,
  ...fetchDiscoveryChangepointsRoute,
};
