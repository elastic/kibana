/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { StackConnectorsPublicPlugin } from './plugin';

export const plugin = (context: PluginInitializerContext) =>
  new StackConnectorsPublicPlugin(context);

// Re-export everything from common (following existing pattern)
export {
  GEMINI_CONNECTOR_ID,
  OPENAI_CONNECTOR_ID,
  OpenAiProviderType,
  OpenAILogo,
  GeminiLogo,
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
  SentinelOneLogo,
  CROWDSTRIKE_CONNECTOR_ID,
  CROWDSTRIKE_SUB_ACTION,
  CrowdstrikeLogo,
  BEDROCK_CONNECTOR_ID,
  BedrockLogo,
  MicrosoftDefenderEndpointLogo,
  INFERENCE_CONNECTOR_ID,
  TeamsLogo,
  TorqLogo,
  TinesLogo,
  XmattersLogo,
  XSOARLogo,
  TheHiveLogo,
  D3SecurityLogo,
  ServiceNowITOMLogo,
  ServiceNowITSMLogo,
  ServiceNowSIRLogo,
  JiraLogo,
  JsmLogo,
  PagerDutyLogo,
  SwimlaneLogo,
  OpsGenieLogo,
  ResilientLogo,
  STACK_CONNECTOR_LOGOS,
} from './common';
