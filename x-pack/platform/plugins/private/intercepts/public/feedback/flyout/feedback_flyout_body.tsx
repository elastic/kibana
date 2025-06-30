/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  type PropsWithChildren,
  type ChangeEvent,
} from 'react';
import {
  EuiFieldText,
  EuiFlyoutBody,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import type { ILicense, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { BenefitsCallout } from '../benefits_callout';
import { ELASTIC_SUPPORT_LINK, FEEDBACK_TYPE } from '../constants';

const feedbackTypes = [
  {
    value: FEEDBACK_TYPE.FEATURE_REQUEST,
    text: (
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.form.select.options.featureRequest"
        defaultMessage="Request a feature"
      />
    ),
  },
  {
    value: FEEDBACK_TYPE.ISSUE_REPORT,
    text: (
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.form.select.options.issueReport"
        defaultMessage="Report an issue"
      />
    ),
  },
  {
    value: FEEDBACK_TYPE.OTHER_FEEDBACK,
    text: (
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.form.select.options.otherFeedback"
        defaultMessage="Other feedback"
      />
    ),
  },
];

const getTextAreaLabel = (feedbackType: FEEDBACK_TYPE) => {
  if (feedbackType === FEEDBACK_TYPE.FEATURE_REQUEST) {
    return (
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.form.textArea.featureRequestLabel"
        defaultMessage="Describe your idea"
      />
    );
  }
  if (feedbackType === FEEDBACK_TYPE.ISSUE_REPORT) {
    return (
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.form.textArea.issueReportLabel"
        defaultMessage="Describe your issue"
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.intercept.feedbackFlyout.form.textArea.otherFeedbackLabel"
      defaultMessage="Share your feedback"
    />
  );
};

interface Props {
  feedbackType: FEEDBACK_TYPE;
  feedbackText: string;
  userEmail: string;
  handleChangeFeedbackType: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleChangeFeedbackText: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleChangeEmail: (e: ChangeEvent<HTMLInputElement>) => void;
  getLicense: LicensingPluginStart['getLicense'];
}
export const FeedbackFlyoutBody = ({
  feedbackType,
  feedbackText,
  userEmail,
  getLicense,
  handleChangeFeedbackType,
  handleChangeFeedbackText,
  handleChangeEmail,
}: Props) => {
  const [license, setLicense] = useState<ILicense | undefined>(undefined);
  const { euiTheme } = useEuiTheme();

  const fetchLicense = useCallback(async () => {
    try {
      const licenseObject = await getLicense();
      setLicense(licenseObject);
    } catch (_) {
      setLicense(undefined);
    }
  }, [getLicense]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const showBenefitsCallout =
    license?.hasAtLeast('platinum') &&
    license?.type !== 'trial' &&
    feedbackType !== FEEDBACK_TYPE.OTHER_FEEDBACK;

  const showSelectHelpText = !showBenefitsCallout && feedbackType === FEEDBACK_TYPE.ISSUE_REPORT;

  const boldTextCss = {
    fontWeight: euiTheme.font.weight.semiBold,
  };

  const Label = ({ children }: PropsWithChildren) => (
    <EuiText size="xs" css={boldTextCss}>
      {children}
    </EuiText>
  );
  return (
    <EuiFlyoutBody>
      <EuiForm component="form">
        <EuiFormRow
          helpText={
            showSelectHelpText && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.intercept.feedbackFlyout.form.select.issueReport.helpText.text"
                    defaultMessage="This form helps us collect general feedback about our products. If you need assistance, {supportLink} instead."
                    values={{
                      supportLink: (
                        <EuiLink href={ELASTIC_SUPPORT_LINK} target="_blank" external={true}>
                          <FormattedMessage
                            id="xpack.intercept.feedbackFlyout.issueReport.helpText.supportLink"
                            defaultMessage="submit a support request"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </>
            )
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
        {showBenefitsCallout && <BenefitsCallout licenseType={license?.type ?? ''} />}
        <EuiFormRow
          label={<Label>{getTextAreaLabel(feedbackType)}</Label>}
          helpText={
            <>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.intercept.feedbackFlyout.form.textArea.helpText"
                  defaultMessage="Please share your email so we can get in touch for possible follow-up questions:"
                />
              </EuiText>
            </>
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
        <EuiFormRow
          label={
            <Label>
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.form.emailInput.label"
                defaultMessage="Your email"
              />
            </Label>
          }
          labelAppend={
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.form.emailInput.optionalText"
                defaultMessage="Optional"
              />
            </EuiText>
          }
        >
          <EuiFieldText
            value={userEmail}
            aria-label={i18n.translate('xpack.intercept.feedbackFlyout.form.emailInput.ariaLabel', {
              defaultMessage: 'Enter your email here',
            })}
            data-test-subj="feedbackEmail"
            type="email"
            onChange={handleChangeEmail}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiFlyoutBody>
  );
};
