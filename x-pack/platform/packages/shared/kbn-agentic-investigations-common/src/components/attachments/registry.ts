/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentGroupRenderer } from './types';

const renderers = new Map<string, AttachmentGroupRenderer>();

/**
 * Registers a custom renderer for the given group id. Throws when the same id is registered
 * twice so misconfigured plugins fail loudly at startup rather than silently clobbering each other.
 */
export const registerAttachmentGroupRenderer = (
  groupId: string,
  renderer: AttachmentGroupRenderer
): void => {
  if (renderers.has(groupId)) {
    throw new Error(
      `AttachmentGroupRenderer already registered for group id "${groupId}". Each group id must be registered at most once.`
    );
  }
  renderers.set(groupId, renderer);
};

/** Returns the registered renderer for the given group id, or `undefined` if none. */
export const getAttachmentGroupRenderer = (groupId: string): AttachmentGroupRenderer | undefined =>
  renderers.get(groupId);
