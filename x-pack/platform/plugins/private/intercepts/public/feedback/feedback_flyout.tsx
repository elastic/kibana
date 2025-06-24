/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, PropsWithChildren, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
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
    value: 'feature-request',
    text: i18n.translate('xpack.intercept.feedbackFlyout.comboboxOptions.featureRequest', {
      defaultMessage: 'Request a feature',
    }),
  },
  {
    value: 'bug-report',
    text: i18n.translate('xpack.intercept.feedbackFlyout.comboboxOptions.bugReport', {
      defaultMessage: 'Report a bug',
    }),
  },
  {
    value: 'general-feedback',
    text: i18n.translate('xpack.intercept.feedbackFlyout.comboboxOptions.other', {
      defaultMessage: 'Other',
    }),
  },
];

export const FeedbackFlyout = () => {
  const { euiTheme } = useEuiTheme();
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState(feedbackTypes[0].value);
  const [_feedbackFiles, setFeedbackFiles] = useState({});
  const [isFeedbackChecked, setIsFeedbackChecked] = useState(true);

  const boldText = {
    fontWeight: euiTheme.font.weight.semiBold,
  };

  const Label = ({ children }: PropsWithChildren) => (
    <EuiText size="xs" css={boldText}>
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

  const handleChangeIsFeedbackChecked = (e: ChangeEvent<HTMLInputElement>) => {
    setIsFeedbackChecked(e.target.checked);
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          {/* TODO: Align close button  */}
          <h2>
            <FormattedMessage id="xpack.intercept.feedbackFlyout.title" defaultMessage="Feedback" />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          label={
            <Label>
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.selectLabel"
                defaultMessage="Type"
              />
            </Label>
          }
          helpText={
            <>
              <EuiSpacer size="s" />
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.selectHelpText"
                defaultMessage="Share the functionality you're missing — it helps us to prioritize what's coming up next at Elastic."
              />
            </>
          }
        >
          <EuiSelect
            options={feedbackTypes}
            value={feedbackType}
            onChange={handleChangeFeedbackType}
            aria-label={i18n.translate('xpack.intercept.feedbackFlyout.selectAriaLabel', {
              defaultMessage: 'Select feedback type',
            })}
            data-test-subj="feedbackTypeSelect"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <Label>
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.textAreaLabel"
                defaultMessage="Describe your request"
              />
            </Label>
          }
        >
          <EuiTextArea
            value={feedbackText}
            onChange={handleChangeFeedbackText}
            aria-label={i18n.translate('xpack.intercept.feedbackFlyout.textAreaAriaLabel', {
              defaultMessage: 'Enter your feedback here',
            })}
            data-test-subj="feedbackTextArea"
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiFilePicker
            display="large"
            multiple
            initialPromptText={
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.filePickerPrompt"
                defaultMessage="Drag here files you want to attach"
              />
            }
            onChange={handleUploadFeedbackFiles}
            aria-label={i18n.translate('xpack.intercept.feedbackFlyout.filePickerAriaLabel', {
              defaultMessage: 'Select files to attach',
            })}
            data-test-subj="feedbackFilePicker"
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiCheckbox
            id="feedbackCheckbox"
            checked={isFeedbackChecked}
            onChange={handleChangeIsFeedbackChecked}
            label={
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.checkboxLabel"
                defaultMessage="I'm ready to participate in a future research to help improve Kibana"
              />
            }
            data-test-subj="feedbackCheckbox"
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      {/* TODO: Possibly change background of footer to match design */}
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="send" // TODO: Get correct icon, this one doesn't exist in EUI
              onClick={() => {}} // TODO: Implement send feedback logic
              data-test-subj="sendFeedbackButton"
            >
              <FormattedMessage id="xpack.intercept.feedbackFlyout.send" defaultMessage="Send" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
