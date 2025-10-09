/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import OpenAILogo from '../../connector_types/openai/logo';
import BedrockLogo from '../../connector_types/bedrock/logo';
import GeminiLogo from '../../connector_types/gemini/logo';
import SentinelOneLogo from '../../connector_types/sentinelone/logo';
import CrowdstrikeLogo from '../../connector_types/crowdstrike/logo';
import TeamsLogo from '../../connector_types/teams/logo';
import TorqLogo from '../../connector_types/torq/logo';
import TinesLogo from '../../connector_types/tines/logo';
import XmattersLogo from '../../connector_types/xmatters/logo';
import XSOARLogo from '../../connector_types/xsoar/logo';
import TheHiveLogo from '../../connector_types/thehive/logo';
import D3SecurityLogo from '../../connector_types/d3security/logo';
import ServiceNowITOMLogo from '../../connector_types/servicenow_itom/logo';
import ServiceNowITSMLogo from '../../connector_types/servicenow_itsm/logo';
import ServiceNowSIRLogo from '../../connector_types/servicenow_sir/logo';
import JiraLogo from '../../connector_types/jira/logo';
import JsmLogo from '../../connector_types/jira-service-management/jsm_logo';
import PagerDutyLogo from '../../connector_types/pagerduty/logo';
import SwimlaneLogo from '../../connector_types/swimlane/logo';
import OpsGenieLogo from '../../connector_types/opsgenie/logo';
import ResilientLogo from '../../connector_types/resilient/logo';
import MicrosoftDefenderEndpointLogo from '../../connector_types/microsoft_defender_endpoint/logo';

// Export additional logos following the same pattern
export {
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
  OpenAILogo,
  GeminiLogo,
  SentinelOneLogo,
  CrowdstrikeLogo,
  BedrockLogo,
  MicrosoftDefenderEndpointLogo,
};

// Mapping object for easy lookup by connector type
export const STACK_CONNECTOR_LOGOS = {
  '.bedrock': BedrockLogo,
  '.openai': OpenAILogo,
  '.gemini': GeminiLogo,
  '.sentinelone': SentinelOneLogo,
  '.crowdstrike': CrowdstrikeLogo,
  '.teams': TeamsLogo,
  '.torq': TorqLogo,
  '.tines': TinesLogo,
  '.xmatters': XmattersLogo,
  '.xsoar': XSOARLogo,
  '.thehive': TheHiveLogo,
  '.d3security': D3SecurityLogo,
  '.servicenow-itom': ServiceNowITOMLogo,
  '.servicenow': ServiceNowITSMLogo,
  '.servicenow-sir': ServiceNowSIRLogo,
  '.jira': JiraLogo,
  '.jira-service-management': JsmLogo,
  '.microsoft_defender_endpoint': MicrosoftDefenderEndpointLogo,
  '.pagerduty': PagerDutyLogo,
  '.swimlane': SwimlaneLogo,
  '.opsgenie': OpsGenieLogo,
  '.resilient': ResilientLogo,
} as const;
