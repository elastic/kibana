/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { StreamsPluginSetup, StreamsPluginStart } from '@kbn/streams-plugin/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { NightshiftInvestigationsServerStart } from '@kbn/nightshift-investigations-plugin/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentBuilderSmlPluginSetup,
  AgentBuilderSmlPluginStart,
} from '@kbn/agent-builder-sml-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type {
  FieldsMetadataServerSetup,
  FieldsMetadataServerStart,
} from '@kbn/fields-metadata-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';

export interface SignificantEventsPluginSetupDependencies {
  agentBuilder?: AgentBuilderPluginSetup;
  agentBuilderSml?: AgentBuilderSmlPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  alerting: AlertingServerSetup;
  /**
   * `void` is Alerting v2's actual setup contract (`alerting_v2/server/types.ts` declares
   * `export type AlertingServerSetup = void`), not a placeholder. It is spelled out here rather
   * than imported because the alerting_v2 server barrel does not re-export the alias. Depending on
   * it at setup only asserts plugin presence; the usable contract arrives at start.
   */
  alertingVTwo: void;
  fieldsMetadata: FieldsMetadataServerSetup;
  cloud?: CloudSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
  streams: StreamsPluginSetup;
}

export interface SignificantEventsPluginStart {
  getEventById: (request: KibanaRequest, eventId: string) => Promise<SignificantEvent | undefined>;
}

export interface SignificantEventsPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  licensing: LicensingPluginStart;
  alerting: AlertingServerStart;
  alertingVTwo: AlertingV2ServerStart;
  inference: InferenceServerStart;
  fieldsMetadata: FieldsMetadataServerStart;
  agentBuilder?: AgentBuilderPluginStart;
  agentBuilderSml?: AgentBuilderSmlPluginStart;
  spaces?: SpacesPluginStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  streams: StreamsPluginStart;
  nightshiftInvestigations?: NightshiftInvestigationsServerStart;
}

export type SignificantEventsServer = StreamsServer & {
  nightshiftInvestigations?: NightshiftInvestigationsServerStart;
};
