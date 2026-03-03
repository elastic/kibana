/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { AttachmentType } from '../../../common';
import type {
  AttachmentAttributesV2,
  AttachmentPatchAttributesV2,
} from '../../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { PartialField } from '../../types';
import type { IndexRefresh } from '../types';
import type { ConfigType } from '../../config';

export interface ServiceContext {
  log: Logger;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  config: ConfigType;
}

export interface AttachedToCaseArgs {
  caseId: string;
  filter?: KueryNode;
  attachmentTypes?: AttachmentType[];
}

export interface GetAttachmentArgs {
  attachmentId: string;
}

export type OptionalAttributes<T> = PartialField<SavedObject<T>, 'attributes'>;

export interface BulkOptionalAttributes<T>
  extends Omit<SavedObjectsBulkResponse<T>, 'saved_objects'> {
  saved_objects: Array<OptionalAttributes<T>>;
}

export type GetAllAlertsAttachToCaseArgs = AttachedToCaseArgs;

export interface AlertIdsAggsResult {
  alertIds: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export interface EventIdsAggsResult {
  eventIds: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export type AlertsAttachedToCaseArgs = AttachedToCaseArgs;

export interface AttachmentsAttachedToCaseArgs extends AttachedToCaseArgs {
  attachmentType: AttachmentType;
  aggregations: Record<string, estypes.AggregationsAggregationContainer>;
}

export interface CountActionsAttachedToCaseArgs extends AttachedToCaseArgs {
  aggregations: Record<string, estypes.AggregationsAggregationContainer>;
}

export interface DeleteAttachmentArgs extends IndexRefresh {
  attachmentIds: string[];
}

export interface CreateAttachmentArgs extends IndexRefresh {
  attributes: AttachmentAttributesV2;
  references: SavedObjectReference[];
  id: string;
  owner: string;
}

export interface BulkCreateAttachments extends IndexRefresh {
  attachments: Array<{
    attributes: AttachmentAttributesV2;
    references: SavedObjectReference[];
    id: string;
  }>;
  owner: string;
}

export interface UpdateArgs {
  attachmentId: string;
  updatedAttributes: AttachmentPatchAttributesV2;
  options?: Omit<SavedObjectsUpdateOptions<AttachmentAttributesV2>, 'upsert'>;
  owner?: string;
}

export type UpdateAttachmentArgs = UpdateArgs;

export interface BulkUpdateAttachmentArgs extends IndexRefresh {
  comments: UpdateArgs[];
  owner: string;
}
