/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiLink,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinks } from '@kbn/doc-links';

export interface AIAgentConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  docLinks: DocLinks;
}

export const AIAgentConfirmationModal: React.FC<AIAgentConfirmationModalProps> = ({
  onConfirm,
  onCancel,
  docLinks,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'aiAgentConfirmModalTitle' });
  return (
    <EuiConfirmModal
      title={
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('aiAssistantManagementSelection.agentConfirmModal.title', {
              defaultMessage: 'Switch to AI Agent',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('aiAssistantManagementSelection.agentConfirmModal.betaLabel', {
                defaultMessage: 'Beta',
              })}
              size="m"
              css={{ verticalAlign: 'middle' }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      titleProps={{ id: confirmModalTitleId }}
      aria-labelledby={confirmModalTitleId}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'aiAssistantManagementSelection.agentConfirmModal.cancelButton',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'aiAssistantManagementSelection.agentConfirmModal.confirmButton',
        {
          defaultMessage: 'Confirm',
        }
      )}
      defaultFocusedButton="confirm"
    >
      <EuiText>
        <FormattedMessage
          id="aiAssistantManagementSelection.agentConfirmModal.description"
          defaultMessage="Switching to AI Agent will affect all users in this space, regardless of which solution, app, or management page they're on.{br}{br} <bold>Please note:</bold> AI Agent will not have access to your chats, prompts, or knowledge base entries from AI Assistant. However this data will always be accessible if you switch back to AI Assistant using the GenAI Settings page. {br}{br} AI Agent does not currently support some AI Assistant features, such as anonymization and chat sharing. {learnMoreLink}"
          values={{
            br: <br />,
            bold: (str) => <strong>{str}</strong>,
            learnMoreLink: (
              <EuiLink
                href={docLinks.agentBuilder.learnMore}
                target="_blank"
                data-test-subj="AIAgentConfirmationModalLearnMoreLink"
              >
                <FormattedMessage
                  id="aiAssistantManagementSelection.agentConfirmModal.learnMoreLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiConfirmModal>
  );
};
