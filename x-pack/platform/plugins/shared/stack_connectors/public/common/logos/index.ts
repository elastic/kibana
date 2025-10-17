/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export const OpenAILogoLazy = lazy(() => import('../../connector_types/openai/logo'));
export const BedrockLogoLazy = lazy(() => import('../../connector_types/bedrock/logo'));
export const GeminiLogoLazy = lazy(() => import('../../connector_types/gemini/logo'));
export const SentinelOneLogoLazy = lazy(() => import('../../connector_types/sentinelone/logo'));
export const CrowdstrikeLogoLazy = lazy(() => import('../../connector_types/crowdstrike/logo'));
export const TeamsLogoLazy = lazy(() => import('../../connector_types/teams/logo'));
export const TorqLogoLazy = lazy(() => import('../../connector_types/torq/logo'));
export const TinesLogoLazy = lazy(() => import('../../connector_types/tines/logo'));
export const XmattersLogoLazy = lazy(() => import('../../connector_types/xmatters/logo'));
export const XSOARLogoLazy = lazy(() => import('../../connector_types/xsoar/logo'));
export const TheHiveLogoLazy = lazy(() => import('../../connector_types/thehive/logo'));
export const D3SecurityLogoLazy = lazy(() => import('../../connector_types/d3security/logo'));
export const ServiceNowITOMLogoLazy = lazy(
  () => import('../../connector_types/servicenow_itom/logo')
);
export const ServiceNowITSMLogoLazy = lazy(
  () => import('../../connector_types/servicenow_itsm/logo')
);
export const ServiceNowSIRLogoLazy = lazy(
  () => import('../../connector_types/servicenow_sir/logo')
);
export const JiraLogoLazy = lazy(() => import('../../connector_types/jira/logo'));
export const JsmLogoLazy = lazy(
  () => import('../../connector_types/jira-service-management/jsm_logo')
);
export const PagerDutyLogoLazy = lazy(() => import('../../connector_types/pagerduty/logo'));
export const SwimlaneLogoLazy = lazy(() => import('../../connector_types/swimlane/logo'));
export const OpsGenieLogoLazy = lazy(() => import('../../connector_types/opsgenie/logo'));
export const ResilientLogoLazy = lazy(() => import('../../connector_types/resilient/logo'));
export const MicrosoftDefenderEndpointLogoLazy = lazy(
  () => import('../../connector_types/microsoft_defender_endpoint/logo')
);

export function getStackConnectorLogoLazy(dottedType: string) {
  switch (dottedType) {
    case '.bedrock':
      return BedrockLogoLazy;
    case '.openai':
      return OpenAILogoLazy;
    case '.gemini':
      return GeminiLogoLazy;
    case '.sentinelone':
      return SentinelOneLogoLazy;
    case '.crowdstrike':
      return CrowdstrikeLogoLazy;
    case '.teams':
      return TeamsLogoLazy;
    case '.torq':
      return TorqLogoLazy;
    case '.tines':
      return TinesLogoLazy;
    case '.xmatters':
      return XmattersLogoLazy;
    case '.xsoar':
      return XSOARLogoLazy;
    case '.thehive':
      return TheHiveLogoLazy;
    case '.d3security':
      return D3SecurityLogoLazy;
    case '.servicenow-itom':
      return ServiceNowITOMLogoLazy;
    case '.servicenow':
      return ServiceNowITSMLogoLazy;
    case '.servicenow-sir':
      return ServiceNowSIRLogoLazy;
    case '.jira':
      return JiraLogoLazy;
    case '.jira-service-management':
      return JsmLogoLazy;
    case '.microsoft_defender_endpoint':
      return MicrosoftDefenderEndpointLogoLazy;
    case '.pagerduty':
      return PagerDutyLogoLazy;
    case '.swimlane':
      return SwimlaneLogoLazy;
    case '.opsgenie':
      return OpsGenieLogoLazy;
    case '.resilient':
      return ResilientLogoLazy;
    default:
      return null;
  }
}

export async function getStackConnectorLogo(
  dottedType: string
): Promise<React.ComponentType<{ width: number; height: number }> | null> {
  switch (dottedType) {
    case '.bedrock':
      return await import('../../connector_types/bedrock/logo').then((module) => module.default);
    case '.openai':
      return await import('../../connector_types/openai/logo').then((module) => module.default);
    case '.gemini':
      return await import('../../connector_types/gemini/logo').then((module) => module.default);
    case '.sentinelone':
      return await import('../../connector_types/sentinelone/logo').then(
        (module) => module.default
      );
    case '.crowdstrike':
      return await import('../../connector_types/crowdstrike/logo').then(
        (module) => module.default
      );
    case '.teams':
      return await import('../../connector_types/teams/logo').then((module) => module.default);
    case '.torq':
      return await import('../../connector_types/torq/logo').then((module) => module.default);
    case '.tines':
      return await import('../../connector_types/tines/logo').then((module) => module.default);
    case '.xmatters':
      return await import('../../connector_types/xmatters/logo').then((module) => module.default);
    case '.xsoar':
      return await import('../../connector_types/xsoar/logo').then((module) => module.default);
    case '.thehive':
      return await import('../../connector_types/thehive/logo').then((module) => module.default);
    case '.d3security':
      return await import('../../connector_types/d3security/logo').then((module) => module.default);
    case '.servicenow-itom':
      return await import('../../connector_types/servicenow_itom/logo').then(
        (module) => module.default
      );
    case '.servicenow':
      return await import('../../connector_types/servicenow_itsm/logo').then(
        (module) => module.default
      );
    case '.servicenow-sir':
      return await import('../../connector_types/servicenow_sir/logo').then(
        (module) => module.default
      );
    case '.jira':
      return await import('../../connector_types/jira/logo').then((module) => module.default);
    case '.jira-service-management':
      return await import('../../connector_types/jira-service-management/jsm_logo').then(
        (module) => module.default
      );
    case '.microsoft_defender_endpoint':
      return await import('../../connector_types/microsoft_defender_endpoint/logo').then(
        (module) => module.default
      );
    case '.pagerduty':
      return await import('../../connector_types/pagerduty/logo').then((module) => module.default);
    case '.swimlane':
      return await import('../../connector_types/swimlane/logo').then((module) => module.default);
    case '.opsgenie':
      return await import('../../connector_types/opsgenie/logo').then((module) => module.default);
    case '.resilient':
      return await import('../../connector_types/resilient/logo').then((module) => module.default);
    default:
      return null;
  }
}
