/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common/tools';
import { ALERTING_API_IDS } from '@kbn/alerting-v2-constants';

/** Shared instructions for finding and reading saved rules, reused by every skill that looks rules up. */
export const generateRuleDiscoveryGuidance =
  (): string => `- To list or search, call ${internalTools.describeApi} for \`${ALERTING_API_IDS.listRules}\` to confirm its params, then call ${internalTools.executeApi} with \`target: "kibana"\`.
- Use \`search\` with keywords from the user's request. For a broad listing, omit \`search\`. Page with \`page\` and \`per_page\`.
- To read a single rule, call ${internalTools.executeApi} for \`${ALERTING_API_IDS.getRule}\` with the rule \`id\`.
- Summarize matches in plain language: name, kind, schedule, and query snippet.`;
