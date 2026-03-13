/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import { MERMAID_CASE_ATTACHMENT_TYPE } from '../../common/constants/cases';

export const registerMermaidCasesAttachment = (cases: CasesPublicSetup) => {
  cases.attachmentFramework.registerUnified({
    id: MERMAID_CASE_ATTACHMENT_TYPE,
    icon: 'visVega',
    displayName: i18n.translate('xpack.agentBuilderPlatform.cases.mermaidAttachment.displayName', {
      defaultMessage: 'Mermaid diagram',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.agentBuilderPlatform.cases.mermaidAttachment.addedEvent"
          defaultMessage="added a mermaid diagram"
        />
      ),
      timelineAvatar: 'visVega',
      children: React.lazy(async () => {
        const { MermaidCaseAttachment } = await import('./mermaid_case_attachment_component');
        return { default: MermaidCaseAttachment };
      }),
    }),
    getAttachmentRemovalObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.agentBuilderPlatform.cases.mermaidAttachment.removedEvent"
          defaultMessage="removed a mermaid diagram"
        />
      ),
    }),
  });
};
