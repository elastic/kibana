/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ChangeEvent, type PropsWithChildren, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const feedbackTypes = [
  {
    value: 'featureRequest',
    text: i18n.translate('xpack.intercept.feedbackFlyout.form.select.options.featureRequest', {
      defaultMessage: 'Request a feature',
    }),
  },
  {
    value: 'bugReport',
    text: i18n.translate('xpack.intercept.feedbackFlyout.form.select.options.bugReport', {
      defaultMessage: 'Report a bug',
    }),
  },
  {
    value: 'otherFeedback',
    text: i18n.translate('xpack.intercept.feedbackFlyout.form.select.options.otherFeedback', {
      defaultMessage: 'Other feedback',
    }),
  },
];

interface Props {
  closeFlyout: () => void;
}

export const FeedbackFlyout = ({ closeFlyout }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState(feedbackTypes[0].value);
  const [_feedbackFiles, setFeedbackFiles] = useState<File[]>([]);
  const [isFutureResearchConsentChecked, setIsFutureResearchConsentChecked] = useState(false);

  const boldTextCss = {
    fontWeight: euiTheme.font.weight.semiBold,
  };

  const footerBackgroundCss = {
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
  };

  const Label = ({ children }: PropsWithChildren) => (
    <EuiText size="xs" css={boldTextCss}>
      {children}
    </EuiText>
  );

  const handleChangeFeedbackText = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFeedbackText(e.target.value);
  };

  const handleChangeFeedbackType = (e: ChangeEvent<HTMLSelectElement>) => {
    setFeedbackType(e.target.value);
  };

  const handleUploadFeedbackFiles = (files: FileList | null) => {
    setFeedbackFiles(files && files.length > 0 ? Array.from(files) : []);
  };

  const handleChangeIsFutureResearchConstentChecked = (e: ChangeEvent<HTMLInputElement>) => {
    setIsFutureResearchConsentChecked(e.target.checked);
  };

  const submitFeedback = () => {
    // TODO
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  id="xpack.intercept.feedbackFlyout.title"
                  defaultMessage="Feedback"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="neutral"
              size="xs"
              css={boldTextCss}
              aria-label={i18n.translate('xpack.intercept.feedbackFlyout.closeButton.ariaLabel', {
                defaultMessage: 'Close flyout',
              })}
              onClick={closeFlyout}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow
            label={
              <Label>
                <FormattedMessage
                  id="xpack.intercept.feedbackFlyout.form.select.label"
                  defaultMessage="Type"
                />
              </Label>
            }
            helpText={
              <>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.intercept.feedbackFlyout.form.select.helpText"
                    defaultMessage="Share the functionality you're missing — it helps us to prioritize what's coming up next at Elastic."
                  />
                </EuiText>
              </>
            }
          >
            <EuiSelect
              options={feedbackTypes}
              value={feedbackType}
              aria-label={i18n.translate('xpack.intercept.feedbackFlyout.form.select.ariaLabel', {
                defaultMessage: 'Select feedback type',
              })}
              data-test-subj="feedbackTypeSelect"
              onChange={handleChangeFeedbackType}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <Label>
                <FormattedMessage
                  id="xpack.intercept.feedbackFlyout.form.textArea.label"
                  defaultMessage="Describe your request"
                />
              </Label>
            }
          >
            <EuiTextArea
              value={feedbackText}
              aria-label={i18n.translate('xpack.intercept.feedbackFlyout.form.textArea.ariaLabel', {
                defaultMessage: 'Enter your feedback here',
              })}
              data-test-subj="feedbackTextArea"
              onChange={handleChangeFeedbackText}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiFilePicker
              display="large"
              multiple
              initialPromptText={
                <FormattedMessage
                  id="xpack.intercept.feedbackFlyout.form.filePicker.initialPromptText"
                  defaultMessage="Drag here files you want to attach"
                />
              }
              aria-label={i18n.translate(
                'xpack.intercept.feedbackFlyout.form.filePicker.ariaLabel',
                {
                  defaultMessage: 'Select files to attach',
                }
              )}
              data-test-subj="feedbackFilePicker"
              onChange={handleUploadFeedbackFiles}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiCheckbox
              id="futureResearchConsentCheckbox"
              checked={isFutureResearchConsentChecked}
              label={
                <FormattedMessage
                  id="xpack.intercept.feedbackFlyout.form.futureResearchConsentCheckbox.label"
                  defaultMessage="I'm ready to participate in a future research to help improve Kibana"
                />
              }
              data-test-subj="futureResearchConsentCheckbox"
              onChange={handleChangeIsFutureResearchConstentChecked}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter css={footerBackgroundCss}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="send" // TODO: Get correct icon, this one doesn't exist in EUI
              data-test-subj="sendFeedbackButton"
              disabled={!feedbackText.trim().length}
              onClick={submitFeedback}
            >
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.form.send"
                defaultMessage="Send"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
