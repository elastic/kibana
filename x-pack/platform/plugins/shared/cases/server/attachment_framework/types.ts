/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type { PersistableStateAttachmentPayload } from '../../common/types/domain';
import type {
  UnifiedAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '../../common/types/domain/attachment/v2';

export type PersistableStateAttachmentState = Pick<
  PersistableStateAttachmentPayload,
  'persistableStateAttachmentTypeId' | 'persistableStateAttachmentState'
>;

export interface PersistableStateAttachmentType
  extends Omit<PersistableState<PersistableStateAttachmentState>, 'migrations'> {
  id: string;
}

export interface PersistableStateAttachmentTypeSetup
  extends Omit<PersistableStateDefinition<PersistableStateAttachmentState>, 'migrations'> {
  id: string;
}

export interface ExternalReferenceAttachmentType {
  id: string;
  /**
   * A function to validate data stored with the attachment type. This function should throw an error
   * if the data is not in the form it expects.
   */
  schemaValidator?: (data: unknown) => void;
}

/**
 * Unified attachment state for server-side persistence
 * Can be either reference-based (has attachmentId) or value-based (has data)
 */
export type UnifiedAttachmentState = Pick<UnifiedAttachmentPayload, 'type' | 'metadata'> &
  (
    | Pick<UnifiedReferenceAttachmentPayload, 'attachmentId'>
    | Pick<UnifiedValueAttachmentPayload, 'data'>
  );

export interface UnifiedAttachmentType
  extends ExternalReferenceAttachmentType,
    Omit<PersistableState<UnifiedAttachmentState>, 'migrations'> {}

export interface UnifiedAttachmentTypeSetup
  extends ExternalReferenceAttachmentType,
    Omit<PersistableStateDefinition<UnifiedAttachmentState>, 'migrations'> {}

export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentTypeSetup
  ) => void;
  registerUnified: (unifiedAttachmentType: UnifiedAttachmentTypeSetup) => void;
}
