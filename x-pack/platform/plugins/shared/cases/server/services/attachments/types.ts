/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { KueryNode } from '@kbn/es-query';
import type { AttachmentType } from '../../../common';
import type {
  AttachmentAttributesV2,
  AttachmentPatchAttributesV2,
} from '../../../common/types/domain';
import type { CasesAttachmentsV2WriterContract } from '../../cases_analytics_v2';
import type { AttachmentPersistedAttributes } from '../../common/types/attachments_v1';
import type { UnifiedAttachmentAttributes } from '../../common/types/attachments_v2';
import type { PartialField } from '../../types';
import type { IndexRefresh } from '../types';
import type { AttachmentSavedObjectType } from '../user_actions/types';
import type { ConfigType } from '../../config';

export type MixSavedObjectResponse =
  | SavedObject<AttachmentPersistedAttributes>
  | SavedObject<UnifiedAttachmentAttributes>
  | { id: string; error: unknown };

export interface ServiceContext {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  config: ConfigType;
  /**
   * Cases-analytics v2 attachments writer. Real implementation when v2 is
   * enabled, `V2_NOOP_ATTACHMENTS_WRITER` otherwise — every call site
   * stays unconditional (no `if (writer)` guards). Captured at factory
   * time so the AttachmentService is oblivious to v2's start lifecycle.
   *
   * Mirrors writes to `.cases-attachments` post-success on `create`,
   * `bulkCreate`, `update`, `bulkUpdate`, and `bulkDelete`. Both legacy
   * `cases-comments` and unified `cases-attachments` SO writes flow
   * through the same writer; the doc-builder normalizes both shapes
   * into the unified analytics doc (see security-team#15066).
   */
  analyticsV2AttachmentsWriter: CasesAttachmentsV2WriterContract;
}

export interface AttachedToCaseArgs {
  caseId: string;
  filter?: KueryNode;
  attachmentTypes?: AttachmentType[];
}

export interface GetAttachmentArgs {
  savedObjectId: string;
}

/**
 * A stored attachment read for deletion; `attributes` is absent when the row fails to decode and
 * `owner` when the stored owner is not a non-empty string.
 */
export interface AttachmentForDeletion {
  id: string;
  type: AttachmentSavedObjectType;
  owner?: string;
  references: SavedObjectReference[];
  /** The file of a file attachment, read from the stored fields whether or not they decode. */
  fileId?: string;
  attributes?: AttachmentAttributesV2;
  version?: string;
}

export type OptionalAttributes<T> = PartialField<SavedObject<T>, 'attributes'> & {
  error?: SavedObjectError;
};

export interface BulkOptionalAttributes<T>
  extends Omit<SavedObjectsBulkResponse<T>, 'saved_objects'> {
  saved_objects: Array<OptionalAttributes<T>>;
}

export type GetAllAlertsAttachToCaseArgs = AttachedToCaseArgs & {
  owner: string;
  /**
   * Extra unified attachment `type` values (e.g. `security.entity`) to include in the
   * query alongside the alert/event types. Used by the "already attached" dedup check so
   * non-alert unified attachments can participate.
   */
  unifiedAttachmentTypes?: string[];
};

/**
 * Fetches unified-only attachments (e.g. `security.entity`) by exact `type`, returning full
 * unified attributes (unlike {@link GetAllAlertsAttachToCaseArgs}).
 *
 * `filter` must only reference `cases-attachments` fields — don't pass
 * {@link getAttachmentAuthorizationFilter}'s combined filter (it also matches `cases-comments`).
 */
export interface GetUnifiedAttachmentsByTypesArgs {
  caseId: string;
  types: string[];
  filter?: KueryNode;
}

export interface AlertIdsAggsResult {
  alertIds: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export interface AttackIdsAggsResult {
  attackIds: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export interface EventIdsAggsResult {
  legacyEventIds: {
    buckets: Array<{
      key: string;
    }>;
  };
  unifiedEventIds: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export type AlertsAttachedToCaseArgs = AttachedToCaseArgs & {
  owner: string;
  /**
   * Excludes alerts whose index belongs to a linked project
   * default to true
   */
  originOnly?: boolean;
};

export interface DeleteAttachmentArgs extends IndexRefresh {
  savedObjectIds: string[];
}

export interface CreateAttachmentArgs extends IndexRefresh {
  attributes: AttachmentAttributesV2;
  references: SavedObjectReference[];
  id: string;
}

export interface BulkCreateAttachments extends IndexRefresh {
  attachments: Array<{
    attributes: AttachmentAttributesV2;
    references: SavedObjectReference[];
    id: string;
  }>;
}

export interface UpdateArgs {
  savedObjectId: string;
  updatedAttributes: AttachmentPatchAttributesV2;
  options?: Omit<SavedObjectsUpdateOptions<AttachmentAttributesV2>, 'upsert'>;
}

export interface UpdateAttachmentArgs extends UpdateArgs {
  /**
   * The saved object type the attachment is stored as. Skips the type lookup when the caller already read it.
   */
  savedObjectType?: AttachmentSavedObjectType;
}

export interface BulkUpdateAttachmentArgs extends IndexRefresh {
  comments: UpdateArgs[];
  requestWithoutType?: boolean;
}

export interface GetCaseIdsByAttachmentIdsArgs {
  type: string;
  attachmentIds: string[];
  /**
   * Authorization + owner filter scoped to the unified `cases-attachments` saved object type.
   */
  unifiedFilter?: KueryNode;
  /**
   * The same filter, scoped to the legacy `cases-comments` saved object type.
   */
  legacyFilter?: KueryNode;
}

/** The cases one attachment id is attached to, with their owners for authorization. */
export interface CasesWithOwnerOfAttachment {
  attachmentId: string;
  cases: Array<{ id: string; owner: string }>;
}

export interface GetCaseIdsByAttachmentIdsAggs {
  attachmentIds: {
    buckets: Array<{
      key: string;
      references: {
        cases: {
          caseIds: {
            sum_other_doc_count: number;
            buckets: Array<{
              key: string;
              attachment: { owner: { buckets: Array<{ key: string }> } };
            }>;
          };
        };
      };
    }>;
  };
}
