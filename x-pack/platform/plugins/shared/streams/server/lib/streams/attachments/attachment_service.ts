/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { AttachmentClient } from './attachment_client';
import type { AttachmentStorageSettings } from './storage_settings';
import type { AttachmentDocument } from './types';
import { attachmentStorageSettings } from './storage_settings';
import { attachmentTypeToSavedObjectTypeMap } from './utils';

export class AttachmentService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<AttachmentClient> {
    const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<AttachmentStorageSettings, AttachmentDocument>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('attachments'),
      attachmentStorageSettings
    );

    // Create an internal saved objects repository that can query across all spaces
    // This is needed to distinguish between "attachment deleted" vs "attachment in different space"
    // Filter to only include saved object types that are registered (some may be disabled, e.g., 'slo' in Logs Essentials tier)
    const typeRegistry = coreStart.savedObjects.getTypeRegistry();
    const availableSoTypes = Object.values(attachmentTypeToSavedObjectTypeMap).filter(
      (soType) => typeRegistry.getType(soType) !== undefined
    );
    const internalSavedObjectsRepository =
      coreStart.savedObjects.createInternalRepository(availableSoTypes);
    const internalSoClient = new SavedObjectsClient(internalSavedObjectsRepository);

    return new AttachmentClient({
      storageClient: adapter.getClient(),
      soClient: coreStart.savedObjects.getScopedClient(request),
      internalSoClient,
      rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
    });
  }
}
