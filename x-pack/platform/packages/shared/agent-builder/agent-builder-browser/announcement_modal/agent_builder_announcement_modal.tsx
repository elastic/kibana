/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

export interface AgentBuilderAnnouncementModalProps {
  onRevert: () => void;
  onContinue: () => void;
  /**
   * When false, the revert action is hidden and copy explains that only admins with
   * Gen AI / space settings access can switch the space back to the legacy Assistant.
   */
  canRevertToAssistant?: boolean;
}

export const AgentBuilderAnnouncementModal: React.FC<AgentBuilderAnnouncementModalProps> = ({
  onRevert,
  onContinue,
  canRevertToAssistant = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'agentBuilderAnnouncementModalTitle' });

  const listCss = css`
    li + li {
      margin-top: ${euiTheme.size.base};
    }
  `;

  const textCss = css`
    margin-bottom: ${euiTheme.size.l};
  `;

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onContinue} css={{ maxWidth: '576px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{i18n.MODAL_TITLE}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge label={i18n.BETA_LABEL} size="m" css={{ verticalAlign: 'middle' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s" css={textCss}>
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.announcementModal.modalDescription"
              defaultMessage="We've set <strong>AI Agent</strong> as the default experience for this space to provide more powerful automation across your environment."
              values={{ strong: (chunks: React.ReactNode) => <strong>{chunks}</strong> }}
            />
          </p>

          <p>
            <em>{i18n.WHAT_TO_EXPECT}</em>
          </p>

          <ul css={listCss}>
            <li>
              <strong>{i18n.DUAL_EXPERIENCES_TITLE}</strong> {i18n.DUAL_EXPERIENCES_BODY}
            </li>
            <li>
              <strong>{i18n.DATA_ISOLATION_TITLE}</strong> {i18n.DATA_ISOLATION_BODY}
            </li>
            <li>
              <strong>{i18n.FEATURE_PARITY_TITLE}</strong> {i18n.FEATURE_PARITY_BODY}
            </li>
          </ul>
        </EuiText>

        <EuiCallOut title={i18n.NEED_HISTORY_TITLE} iconType="hourglass" color="primary" size="s">
          <EuiText size="s">
            <p>{canRevertToAssistant ? i18n.NEED_HISTORY_BODY : i18n.NEED_HISTORY_BODY_READONLY}</p>
          </EuiText>
        </EuiCallOut>
      </EuiModalBody>

      <EuiModalFooter>
        {canRevertToAssistant ? (
          <EuiButtonEmpty onClick={onRevert} data-test-subj="agentBuilderAnnouncementRevertButton">
            {i18n.REVERT_BUTTON}
          </EuiButtonEmpty>
        ) : null}
        <EuiButton
          fill
          onClick={onContinue}
          data-test-subj="agentBuilderAnnouncementContinueButton"
        >
          {canRevertToAssistant ? i18n.CONTINUE_BUTTON : i18n.CONTINUE_BUTTON_READONLY}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
