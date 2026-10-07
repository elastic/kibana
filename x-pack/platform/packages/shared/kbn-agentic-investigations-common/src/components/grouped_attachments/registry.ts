/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FlyoutGroupedAttachmentDefinition,
  FlyoutGroupedAttachments,
  FlyoutGroupedAttachmentsRegistry,
} from './types';

export const createFlyoutGroupedAttachmentsRegistry = (): FlyoutGroupedAttachmentsRegistry => {
  const definitions = new Map<FlyoutGroupedAttachments, FlyoutGroupedAttachmentDefinition>();

  return {
    register: (group, attachmentTypes, renderer) => {
      if (definitions.has(group)) {
        throw new Error(`Flyout grouped attachment "${group}" is already registered`);
      }
      definitions.set(group, { attachmentTypes, renderer });
    },
    get: (group) => definitions.get(group),
  };
};
