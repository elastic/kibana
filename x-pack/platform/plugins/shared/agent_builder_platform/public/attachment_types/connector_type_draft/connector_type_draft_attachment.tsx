/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import {
  CONNECTOR_TYPE_DRAFT_QUERY_PARAM,
  CONNECTOR_TYPE_DRAFT_STORAGE_PREFIX,
} from '@kbn/triggers-actions-ui-plugin/public/common/connector_type_draft_handoff';
import type { ConnectorTypeDraftAttachment } from '../../../common/attachments';

const CONNECTORS_PATH = '/insightsAndAlerting/triggersActionsConnectors/connectors';

export const createConnectorTypeDraftAttachmentDefinition = ({
  application,
  notifications,
}: {
  application: CoreStart['application'];
  notifications: CoreStart['notifications'];
}): AttachmentUIDefinition<ConnectorTypeDraftAttachment> => ({
  getLabel: ({ data }) => data.draft.displayName,
  getHeader: ({ attachment }) => ({
    icon: 'wrench',
    subtitle: attachment.data.documentation_url,
  }),
  renderInlineContent: ({ attachment }) => (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.agentBuilderPlatform.attachments.connectorTypeDraft.review', {
            defaultMessage: 'Review the draft for {displayName} before saving the connector type.',
            values: { displayName: attachment.data.draft.displayName },
          })}
        </p>
      </EuiText>
    </EuiPanel>
  ),
  getActionButtons: ({ attachment, isCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: i18n.translate(
          'xpack.agentBuilderPlatform.attachments.connectorTypeDraft.openBuilder',
          { defaultMessage: 'Open prefilled builder' }
        ),
        icon: 'external',
        type: ActionButtonType.PRIMARY,
        handler: () => {
          const key = attachment.id;
          try {
            sessionStorage.setItem(
              `${CONNECTOR_TYPE_DRAFT_STORAGE_PREFIX}${key}`,
              JSON.stringify(attachment.data.draft)
            );
          } catch {
            notifications.toasts.addDanger({
              title: i18n.translate(
                'xpack.agentBuilderPlatform.attachments.connectorTypeDraft.handoffError',
                { defaultMessage: 'Could not open the connector draft in this browser.' }
              ),
            });
            return;
          }
          const path = `${CONNECTORS_PATH}?${CONNECTOR_TYPE_DRAFT_QUERY_PARAM}=${encodeURIComponent(
            key
          )}`;
          void application.navigateToApp('management', { path });
        },
      },
    ];
  },
});
