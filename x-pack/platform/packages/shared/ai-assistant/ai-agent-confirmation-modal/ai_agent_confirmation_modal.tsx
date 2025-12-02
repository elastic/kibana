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

export interface AIAgentConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const AIAgentConfirmationModal: React.FC<AIAgentConfirmationModalProps> = ({
  onConfirm,
  onCancel,
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
          defaultMessage="Based on the new <bold>Agent Builder</bold> platform, <bold>AI Agent</bold> is our new agentic chat experience. Learn more in our {learnMoreLink}.{br}{br}By selecting it as the default AI chat experience, <bold>all users in this space will be affected</bold>, regardless of what solution (Observability, Security, Elasticsearch), Analytics app (Discover, Dashboards, ML, Maps, Graph) or Management page they will be using.{br}{br}As you start anew with the AI Agent, all existing chats and prompts will still be stored and are accessible at all times by switching back to the default experience in the GenAI Settings.{br}{br}<bold>Please note:</bold> Some features as anonymization and chat sharing are not currently supported by the AI Agent. Check the comparison {comparisonLink}."
          values={{
            br: <br />,
            bold: (str) => <strong>{str}</strong>,
            learnMoreLink: (
              // TODO: Update link when documentation is ready
              <EuiLink href="#" target="_blank" data-test-subj="aiAgentDocumentationLink">
                <FormattedMessage
                  id="aiAssistantManagementSelection.agentConfirmModal.documentationLink"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
            comparisonLink: (
              // TODO: Update link when documentation is ready
              <EuiLink href="#" target="_blank" data-test-subj="aiAgentComparisonLink">
                <FormattedMessage
                  id="aiAssistantManagementSelection.agentConfirmModal.comparisonLink"
                  defaultMessage="here"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiConfirmModal>
  );
};
