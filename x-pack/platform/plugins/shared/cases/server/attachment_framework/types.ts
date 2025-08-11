/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type {
  PersistableStateAttachmentPayload,
  SuggestionOwner,
  SuggestionContext,
  SuggestionHandlerResponse,
  GenericSuggestionPayload,
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

export interface SuggestionType<
  TPayload extends GenericSuggestionPayload = GenericSuggestionPayload
> {
  /* Unique identifier for the suggestion type */
  id: string;
  /* Unique identifier for the type of attachment the suggestion is for */
  attachmentTypeId: string;
  /* The owner of the suggestion. Dictates which solutions can use this suggestion */
  owner: SuggestionOwner;
  // Handlers and tools associated with each handler. Can be called programmatically or used with tool calling
  handlers: Record<
    string,
    {
      handler: SuggestionHandler<TPayload>;
      tool: ToolDefinition;
    }
  >;
}

export type SuggestionHandler<
  TPayload extends GenericSuggestionPayload = GenericSuggestionPayload
> = (params: SuggestionHandlerParams) => Promise<SuggestionHandlerResponse<TPayload>>;

export interface SuggestionHandlerParams {
  request: KibanaRequest;
  context: SuggestionContext;
}

export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentTypeSetup
  ) => void;
  registerSuggestion: <TPayload extends GenericSuggestionPayload = GenericSuggestionPayload>(
    attachmentSuggestion: SuggestionType<TPayload>
  ) => void;
}
