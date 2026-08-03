/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

/**
 * Browser UI definitions for the Context Engine attachment types. Kept minimal —
 * a label + icon for the pre-send chip. The attachments' behaviour (representation
 * and bounded tools) is defined server-side in the context_engine plugin.
 *
 * Registered here (not in context_engine) because context_engine cannot depend on
 * Agent Builder — that would form a dependency cycle.
 */

// Attachment type ids — must match context_engine's `common/agent_builder/constants.ts`.
// Declared locally (rather than imported from `@kbn/context-engine-plugin/public`) to keep
// this registration self-contained and independent of context_engine's bundle load order.
export const AI_INDEX_ATTACHMENT_TYPE = 'platform.context_engine.ai_index';
export const PATTERN_ATTACHMENT_TYPE = 'platform.context_engine.pattern';
export const CASE_ATTACHMENT_TYPE = 'platform.context_engine.case';

export const aiIndexAttachmentDefinition: AttachmentUIDefinition = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.contextEngine.aiIndex.label', {
      defaultMessage: 'AI index',
    }),
  getIcon: () => 'indexMapping',
};

export const patternAttachmentDefinition: AttachmentUIDefinition = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.contextEngine.pattern.label', {
      defaultMessage: 'Failure pattern',
    }),
  getIcon: () => 'inspect',
};

export const caseAttachmentDefinition: AttachmentUIDefinition = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.contextEngine.case.label', {
      defaultMessage: 'Failing case',
    }),
  getIcon: () => 'bug',
};
