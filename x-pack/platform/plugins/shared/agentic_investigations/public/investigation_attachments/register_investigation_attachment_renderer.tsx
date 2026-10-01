/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

/** Where the content renders: inline in the chat, or in the conversation details flyout. */
export type InvestigationAttachmentVariant = 'inline' | 'details';

export interface InvestigationAttachmentContentProps<TDocument> {
  document: TDocument;
  variant: InvestigationAttachmentVariant;
}

export interface InvestigationAttachmentRenderer<TDocument> {
  type: string;
  /** Pill and header label; may read the attachment's document. */
  getLabel: (document: TDocument) => string;
  icon: IconType;
  /** Imported on first render, so the content stays out of the page load bundle. */
  loadContent: () => Promise<React.ComponentType<InvestigationAttachmentContentProps<TDocument>>>;
}

/**
 * Builds the Agent Builder UI definition of a by-reference investigation attachment: one lazily
 * loaded content component for both the inline chat render and the details flyout.
 */
export const createInvestigationAttachmentUIDefinition = <TType extends string, TDocument>({
  getLabel,
  icon,
  loadContent,
}: InvestigationAttachmentRenderer<TDocument>): AttachmentUIDefinition<
  Attachment<TType, TDocument>
> => {
  const Content = React.lazy(() => loadContent().then((component) => ({ default: component })));
  const render = (document: TDocument, variant: InvestigationAttachmentVariant) => (
    <Suspense fallback={<EuiLoadingSpinner size="m" />}>
      <Content document={document} variant={variant} />
    </Suspense>
  );

  return {
    getLabel: (attachment) => getLabel(attachment.data),
    getIcon: () => icon,
    renderInlineContent: ({ attachment }) => render(attachment.data, 'inline'),
    renderConversationDetailsContent: ({ attachment }) => render(attachment.data, 'details'),
  };
};

/** Registers an investigation attachment's renderer with Agent Builder. */
export const registerInvestigationAttachmentRenderer = <TType extends string, TDocument>(
  agentBuilder: AgentBuilderPluginStart,
  renderer: InvestigationAttachmentRenderer<TDocument> & { type: TType }
): void => {
  agentBuilder.attachments.addAttachmentType(
    renderer.type,
    createInvestigationAttachmentUIDefinition<TType, TDocument>(renderer)
  );
};
