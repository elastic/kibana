/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
} from '../../tools/register_tools';
import description from './description.text';
import content from './skill.md.text';

export const knowledgeIndicatorsManagementSkill = defineSkillType({
  id: 'knowledge-indicators-management',
  name: 'knowledge-indicators-management',
  basePath: 'skills/platform/streams',
  description,
  selectorInstructions:
    'Use to set up, discover, or manage Knowledge Indicators (KIs) in Streams — persistent monitoring features that track metric anomalies, thresholds, or behavioral deviations over time in Kibana AI Indices. ' +
    'Use when the user wants to create or configure a monitoring feature for detecting anomalies or significant patterns. ' +
    'Do NOT use when the user is querying or managing existing Elastic ML anomaly detection jobs — use anomaly-detection for that.',
  content,
  getRegistryTools: () => [
    SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
    SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID,
    SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
  ],
});
