/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import { attachFromTool, type ToolAttachmentOutcome } from '../../investigation_attachments';
import type { WrittenAttach } from '../services/impact_service';
import { impactAttachment } from './impact_attachment_type';

/**
 * Agent tool path: writes the impact index first, then adds or updates the by-reference
 * attachment in the run's attachment state, persisted when the round ends.
 */
export const attachImpactFromTool = ({
  context,
  readImpact,
  writeImpact,
  revertImpact,
}: {
  context: Pick<ToolHandlerContext, 'attachments' | 'request'>;
  readImpact: () => Promise<Impact | undefined>;
  writeImpact: () => Promise<WrittenAttach>;
  revertImpact: (args: WrittenAttach) => Promise<void>;
}): Promise<{ impact: Impact; attachment: ToolAttachmentOutcome }> =>
  attachFromTool({
    type: IMPACT_ATTACHMENT_TYPE,
    context,
    read: readImpact,
    write: writeImpact,
    revert: revertImpact,
    hidden: impactAttachment.hiddenInConversation,
  }).then(({ document, attachment }) => ({ impact: document, attachment }));
