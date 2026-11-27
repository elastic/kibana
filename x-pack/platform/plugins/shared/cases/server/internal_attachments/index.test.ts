/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../common/constants/attachments';
import { isUnifiedOnlyAttachmentType } from '../../common/utils/attachments';
import { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { getAttachmentTypeTransformers } from '../common/attachments';
import { passThroughTransformer } from '../common/attachments/base';
import { registerInternalAttachments } from '.';

describe('registerInternalAttachments', () => {
  it('gives every internal type with a legacy form a legacy <-> unified transformer', () => {
    const registry = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(registry);

    const missingTransformer = registry
      .list()
      .map(({ id }) => id)
      .filter(
        (id) =>
          !isUnifiedOnlyAttachmentType(id) &&
          getAttachmentTypeTransformers(id, '') === passThroughTransformer
      );

    expect(registry.list().length).toBeGreaterThan(0);
    expect(missingTransformer).toEqual([]);
  });

  it('registers the incident timeline entry type only when the flag is on', () => {
    const disabled = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(disabled);
    expect(disabled.has(INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE)).toBe(false);

    const enabled = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(enabled, { incidentTimelineEnabled: true });
    expect(enabled.has(INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE)).toBe(true);
  });
});
