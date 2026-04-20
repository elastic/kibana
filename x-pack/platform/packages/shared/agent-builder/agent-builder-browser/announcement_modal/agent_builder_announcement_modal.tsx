/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLink,
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

const AGENT_BUILDER_DOCUMENTATION_URL =
  'https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder';

export interface AgentBuilderAnnouncementModalProps {
  onRevert: () => void;
  onContinue: () => void;
  /**
   * When false, the revert action is hidden and the body shows a short FYI plus a link to
   * documentation (no bullets or history callout), since the user cannot change Gen AI settings.
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

  const calloutAfterBodyWrapperCss = css`
    margin-top: 2em;
  `;

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onContinue} css={{ maxWidth: '576px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.announcementModal.modalDescription"
              defaultMessage="We've set <strong>AI Agent</strong> as the default experience for this space to provide more powerful automation across your environment."
              values={{ strong: (chunks: React.ReactNode) => <strong>{chunks}</strong> }}
            />
          </p>

          {canRevertToAssistant ? (
            <>
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
            </>
          ) : null}
        </EuiText>

        {canRevertToAssistant ? null : (
          <div css={calloutAfterBodyWrapperCss}>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.LEARN_MORE_CALLOUT_TITLE}
              iconType="bulb"
              color="primary"
              size="s"
              data-test-subj="agentBuilderAnnouncementLearnMoreCallout"
            >
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.agentBuilder.announcementModal.learnMoreDescriptionDetail"
                    defaultMessage="Learn more in our {documentationLink}."
                    values={{
                      documentationLink: (
                        <EuiLink
                          href={AGENT_BUILDER_DOCUMENTATION_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          external
                          data-test-subj="agentBuilderAnnouncementDocumentationLink"
                        >
                          {i18n.DOCUMENTATION_LINK_TEXT}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiCallOut>
          </div>
        )}

        {canRevertToAssistant ? (
          <div css={calloutAfterBodyWrapperCss}>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.NEED_HISTORY_TITLE}
              iconType="hourglass"
              color="primary"
              size="s"
            >
              <EuiText size="s">
                <p>{i18n.NEED_HISTORY_BODY}</p>
              </EuiText>
            </EuiCallOut>
          </div>
        ) : null}
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
