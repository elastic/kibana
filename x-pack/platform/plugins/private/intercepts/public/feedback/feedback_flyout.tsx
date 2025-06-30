/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  type ChangeEvent,
  type PropsWithChildren,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import type { ILicense, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { ELASTIC_SUPPORT_LINK } from './constants';
import { BenefitsCallout } from './benefits_callout';

enum FeedbackType {
  FeatureRequest = 'featureRequest',
  IssueReport = 'issueReport',
  OtherFeedback = 'otherFeedback',
}

const feedbackTypes = [
  {
    value: FeedbackType.FeatureRequest,
    text: i18n.translate('xpack.intercept.feedbackFlyout.form.select.options.featureRequest', {
      defaultMessage: 'Request a feature',
    }),
  },
  {
    value: FeedbackType.IssueReport,
    text: i18n.translate('xpack.intercept.feedbackFlyout.form.select.options.issueReport', {
      defaultMessage: 'Report an issue',
    }),
  },
  {
    value: FeedbackType.OtherFeedback,
    text: i18n.translate('xpack.intercept.feedbackFlyout.form.select.options.otherFeedback', {
      defaultMessage: 'Other feedback',
    }),
  },
];

const getTextAreaLabel = (feedbackType: FeedbackType) => {
  if (feedbackType === FeedbackType.FeatureRequest) {
    return (
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.form.textArea.featureRequestLabel"
        defaultMessage="Describe your idea"
      />
    );
  }
  if (feedbackType === FeedbackType.IssueReport) {
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
  core: CoreStart;
  closeFlyout: () => void;
  getLicense: LicensingPluginStart['getLicense'];
}

export const FeedbackFlyout = ({ core, closeFlyout, getLicense }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState(FeedbackType.FeatureRequest);
  const [userEmail, setUserEmail] = useState('');
  const [license, setLicense] = useState<ILicense | undefined>(undefined);

  const showBenefitsCallout =
    license?.hasAtLeast('platinum') &&
    license?.type !== 'trial' &&
    feedbackType !== FeedbackType.OtherFeedback;

  const showSelectHelpText = !showBenefitsCallout && feedbackType === FeedbackType.IssueReport;

  const isSendFeedbackButtonDisabled = !feedbackText.trim().length;

  const getEmail = useCallback(async () => {
    try {
      const user = await core.security.authc.getCurrentUser();
      setUserEmail(user?.email || '');
    } catch (_) {
      setUserEmail('');
    }
  }, [core.security.authc]);

  const fetchLicense = useCallback(async () => {
    try {
      const licenseObject = await getLicense();
      setLicense(licenseObject);
    } catch (_) {
      setLicense(undefined);
    }
  }, [getLicense]);

  useEffect(() => {
    getEmail();
  }, [getEmail]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

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
    setFeedbackType(e.target.value as FeedbackType);
  };

  const handleChangeEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
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
              aria-label={i18n.translate(
                'xpack.intercept.feedbackFlyout.form.emailInput.ariaLabel',
                {
                  defaultMessage: 'Enter your email here',
                }
              )}
              data-test-subj="feedbackEmail"
              type="email"
              onChange={handleChangeEmail}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter css={footerBackgroundCss}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.intercept.feedbackFlyout.form.infoText"
                    defaultMessage="Session data included"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="info"
                  color="subdued"
                  content={
                    <FormattedMessage
                      id="xpack.intercept.feedbackFlyout.form.infoTooltip"
                      defaultMessage="By sending feedback, you acknowledge that session information is collected along with your input to help us better understand your experience. Please do not include any sensitive, personal, or confidential information in this form."
                    />
                  }
                  iconProps={{
                    className: 'eui-alignTop',
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj="sendFeedbackButton"
              disabled={isSendFeedbackButtonDisabled}
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
