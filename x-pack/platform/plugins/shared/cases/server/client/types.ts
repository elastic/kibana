/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsClientContract, Logger, KibanaRequest } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { KueryNode } from '@kbn/es-query';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import type { CasesSearchRequest } from '../../common/types/api';
import type { Authorization } from '../authorization/authorization';
import type {
  CaseConfigureService,
  CasesService,
  CaseUserActionService,
  ConnectorMappingsService,
  AttachmentService,
  AlertService,
  TemplatesService,
  FieldDefinitionsService,
  CaseTaskService,
  CaseTaskTemplateService,
  CaseTaskCommentService,
} from '../services';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import type { LicensingService } from '../services/licensing';
import type { NotificationService } from '../services/notifications/types';
import type { User } from '../common/types/user';
import type { ConfigType } from '../config';
import type { CasesEventBus } from '../events/event_bus';
import type { ActionSource } from '../../common/types/domain';
import type { CasesClient } from './client';

export interface CasesServices {
  alertsService: AlertService;
  caseService: CasesService;
  caseConfigureService: CaseConfigureService;
  connectorMappingsService: ConnectorMappingsService;
  userActionService: CaseUserActionService;
  attachmentService: AttachmentService;
  licensingService: LicensingService;
  notificationService: NotificationService;
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
  taskService: CaseTaskService;
  taskTemplateService: CaseTaskTemplateService;
  taskCommentService: CaseTaskCommentService;
}

/**
 * Parameters for initializing a cases client
 */
export interface CasesClientArgs {
  readonly services: CasesServices;
  readonly user: User;
  readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  readonly logger: Logger;
  readonly lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  readonly authorization: PublicMethodsOf<Authorization>;
  readonly actionsClient: PublicMethodsOf<ActionsClient>;
  readonly unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  readonly securityStartPlugin: SecurityPluginStart;
  readonly spaceId: string;
  readonly savedObjectsSerializer: ISavedObjectsSerializer;
  readonly publicBaseUrl?: IBasePath['publicBaseUrl'];
  readonly fileService: FileServiceStart;
  readonly usageCounter?: IUsageCounter;
  readonly config: ConfigType;
  readonly casesEventBus?: CasesEventBus;
  readonly request: KibanaRequest;
  readonly closeReasonValidator?: (closeReason: string, owner: string) => Promise<boolean>;
  readonly clientSource: CasesClientSource;
  /** Present when Workflows is installed and running workflows from cases is on; tasks use it. */
  readonly workflowsManagement?: WorkflowsServerPluginSetup['management'];
  /** Present when Agent Builder is installed and Cases chat is on; the case room uses it. */
  readonly agentBuilder?: AgentBuilderPluginStart;
}

export type CasesSearchParams = Partial<
  Pick<
    CasesSearchRequest,
    | 'tags'
    | 'reporters'
    | 'status'
    | 'status_key'
    | 'severity'
    | 'owner'
    | 'from'
    | 'to'
    | 'assignees'
    | 'category'
    | 'sortField'
    | 'customFields'
    | 'access'
    | 'source'
    | 'needsDecision'
  > & { authorizationFilter?: KueryNode }
>;

/**
 * The source that created a cases client.
 * - `plugin_contract`: called via another plugin's contract (e.g. Security Solution, Fleet).
 * - `external_sync`: automatic push, or a sync applied from the external incident.
 */
export type CasesClientSource =
  | 'rest_api'
  | 'connector'
  | 'workflow'
  | 'agent_builder'
  | 'plugin_contract'
  | 'external_sync';

export interface GetCasesClientOptions {
  actionSource?: ActionSource;
}

export type GetCasesClientFn = (
  request: KibanaRequest,
  options?: GetCasesClientOptions
) => Promise<CasesClient>;
