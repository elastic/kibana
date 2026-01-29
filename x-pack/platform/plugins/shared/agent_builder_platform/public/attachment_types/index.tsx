/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import {
  AttachmentType,
  type TextAttachment,
  type ScreenContextAttachment,
  type EsqlAttachment,
  type Attachment,
} from '@kbn/agent-builder-common/attachments';
import type { WorkflowDraftAttachmentData } from '../../server/attachment_types/workflow_draft';
import { WorkflowDraftViewer } from './workflow_draft_viewer';

/**
 * Attachment type ID for workflow drafts (must match server-side).
 */
const WORKFLOW_DRAFT_ATTACHMENT_TYPE = 'workflow_draft';

/**
 * Workflow draft attachment type.
 */
type WorkflowDraftAttachment = Attachment<
  typeof WORKFLOW_DRAFT_ATTACHMENT_TYPE,
  WorkflowDraftAttachmentData
>;

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  attachments.addAttachmentType<TextAttachment>(AttachmentType.text, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.text.label', {
        defaultMessage: 'Text',
      }),
    getIcon: () => 'document',
  });

  attachments.addAttachmentType<ScreenContextAttachment>(AttachmentType.screenContext, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.screenContext.label', {
        defaultMessage: 'Screen context',
      }),
    getIcon: () => 'inspect',
  });

  attachments.addAttachmentType<EsqlAttachment>(AttachmentType.esql, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.esql.label', {
        defaultMessage: 'ES|QL query',
      }),
    getIcon: () => 'editorCodeBlock',
  });

  // Register workflow_draft with visual preview
  attachments.addAttachmentType<WorkflowDraftAttachment>(WORKFLOW_DRAFT_ATTACHMENT_TYPE, {
    getLabel: (attachment) =>
      attachment.data?.name ??
      i18n.translate('xpack.agentBuilderPlatform.attachments.workflowDraft.label', {
        defaultMessage: 'Workflow Draft',
      }),
    getIcon: () => 'pipelineApp',
    renderContent: ({ attachment }) => {
      return <WorkflowDraftViewer attachment={attachment} />;
    },
  });
};
