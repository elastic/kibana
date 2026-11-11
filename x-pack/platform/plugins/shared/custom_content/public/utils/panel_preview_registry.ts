/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentContextAttachmentData } from '../../common/panel_context_attachment';

type PanelPreviewHandler = (data: CustomContentContextAttachmentData) => void;

/**
 * Bridges the chat attachment card and the panel it describes. The card is rendered by agent
 * builder and has no embeddable reference, so mounted panels register themselves here under their
 * uuid and the card's Preview action resolves the handler by the attachment's `embeddable_id`.
 */
const handlersByEmbeddableId = new Map<string, PanelPreviewHandler>();

export const registerPanelPreviewHandler = (
  embeddableId: string,
  handler: PanelPreviewHandler
): (() => void) => {
  handlersByEmbeddableId.set(embeddableId, handler);
  return () => {
    if (handlersByEmbeddableId.get(embeddableId) === handler) {
      handlersByEmbeddableId.delete(embeddableId);
    }
  };
};

/**
 * Applies an attachment version to its panel. Returns false when the panel is not mounted — the
 * conversation outlives the dashboard, so the target is often gone.
 */
export const previewPanelVersion = (data: CustomContentContextAttachmentData): boolean => {
  const handler = handlersByEmbeddableId.get(data.embeddable_id);
  if (!handler) return false;
  handler(data);
  return true;
};
