/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/inference-common';
import type { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type {
  PersistableStateAttachmentPayload,
  SuggestionOwner,
  SuggestionContext,
  SuggestionResponse,
} from '../../common/types/domain';

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

export interface SuggestionType<TPayload = Record<string, unknown>> {
  /* Unique identifier for the suggestion type */
  id: string;
  /* Unique identifier for the type of attachment the suggestion is for */
  attachmentId: string;
  /* The owner of the suggestion. Dictates which solutions can use this suggestion */
  owner: SuggestionOwner;
  // Tools available for fetching, keyed by tool name
  tools: Record<string, ToolDefinition>;
  // Handlers. Can be called programmatically or used with tool calling, keyed to match the tool name
  handlers: Record<string, SuggestionHandler<TPayload>>;
}

export type SuggestionHandler<TPayload = Record<string, unknown>> = (
  params: SuggestionContext
) => Promise<SuggestionResponse<TPayload>>;

export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentTypeSetup
  ) => void;
  registerSuggestion: <TPayload = Record<string, unknown>>(
    attachmentSuggestion: SuggestionType<TPayload>
  ) => void;
}
