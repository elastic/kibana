/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
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
} from '../services';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import type { LicensingService } from '../services/licensing';
import type { NotificationService } from '../services/notifications/types';
import type { User } from '../common/types/user';

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
  readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  readonly externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  readonly unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  readonly securityStartPlugin: SecurityPluginStart;
  readonly spaceId: string;
  readonly savedObjectsSerializer: ISavedObjectsSerializer;
  readonly publicBaseUrl?: IBasePath['publicBaseUrl'];
  readonly fileService: FileServiceStart;
  readonly usageCounter?: IUsageCounter;
}

export type CasesSearchParams = Partial<
  Pick<
    CasesSearchRequest,
    | 'tags'
    | 'reporters'
    | 'status'
    | 'severity'
    | 'owner'
    | 'from'
    | 'to'
    | 'assignees'
    | 'category'
    | 'sortField'
    | 'customFields'
  > & { authorizationFilter?: KueryNode }
>;
