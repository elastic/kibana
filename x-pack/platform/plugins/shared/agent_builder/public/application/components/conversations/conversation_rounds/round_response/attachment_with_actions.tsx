/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { EuiButton } from '@elastic/eui';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { AttachmentsService } from '../../../../../services/attachments/attachements_service';
import { useKibana } from '../../../../hooks/use_kibana';

interface AttachmentWithActionsProps {
  attachment: UnknownAttachment;
  attachmentsService: AttachmentsService;
  isSidebar: boolean;
  conversationId: string;
}

/**
 * Component that renders an attachment with its action buttons.
 */
export const AttachmentWithActions: React.FC<AttachmentWithActionsProps> = ({
  attachment,
  attachmentsService,
  isSidebar,
  conversationId,
}) => {
  const {
    services: { settings },
  } = useKibana();
  const isExperimentalFeaturesEnabled = settings?.client.get<boolean>(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );

  if (isExperimentalFeaturesEnabled === false) {
    return null;
  }

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  if (!uiDefinition) {
    return null;
  }

  const actionButtons = uiDefinition.getActionButtons?.({
    attachment,
    isSidebar,
    updateOrigin: async (originId: string) => {
      // TODO: Implement updateOrigin
      //   attachmentsService.updateOrigin(conversationId, attachment.id, originId);
    },
  });

  return (
    <>
      {actionButtons?.map((button) => (
        <EuiButton key={button.label} onClick={button.handler}>
          {button.label}
        </EuiButton>
      ))}
      {uiDefinition?.renderContent?.({ attachment, isSidebar })}
    </>
  );
};
