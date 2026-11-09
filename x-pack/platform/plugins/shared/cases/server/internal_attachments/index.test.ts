/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnifiedOnlyAttachmentType } from '../../common/utils/attachments';
import { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { getAttachmentTypeTransformers } from '../common/attachments';
import { passThroughTransformer } from '../common/attachments/base';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../common/constants/attachments';
import { registerInternalAttachments } from '.';

describe('registerInternalAttachments', () => {
  it('gives every internal type with a legacy form a legacy <-> unified transformer', () => {
    const registry = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(registry, { hasProposalsPluginEnabled: true });

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

  it('registers the proposal type only when the proposals plugin is enabled', () => {
    const withoutProposals = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(withoutProposals);
    expect(withoutProposals.has(PROPOSAL_ATTACHMENT_TYPE)).toBe(false);

    const withProposals = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(withProposals, { hasProposalsPluginEnabled: true });
    expect(withProposals.has(PROPOSAL_ATTACHMENT_TYPE)).toBe(true);
    expect(withProposals.get(PROPOSAL_ATTACHMENT_TYPE)?.workflowSchema).toBe(false);
  });
});
