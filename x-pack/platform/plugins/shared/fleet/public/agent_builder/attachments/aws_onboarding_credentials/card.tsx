/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiLink, EuiSteps, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';

import type { AwsOnboardingCredentialsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_credentials_attachment';
import { useManagedOnboarding } from '../../../components/cloud_connector/hooks/use_managed_onboarding';
import { useStartServices } from '../../../hooks';
import { sendGetAwsOnboardingVerify } from '../../../hooks/use_request/aws_onboarding';

import { downloadBootstrapTemplate } from './download_template';

export const AWS_ONBOARDING_VERIFY_QUERY_KEY = 'aws-onboarding-verify';

interface CardStatus {
  kind: 'pending' | 'configured' | 'verified' | 'failed';
  accountId?: string;
  error?: string;
}

const useCardStatus = (data: AwsOnboardingCredentialsAttachmentData): CardStatus => {
  const { cloud } = useStartServices();
  const { isEnabled, isConfigured } = useManagedOnboarding(cloud);

  const verify = useQuery(
    [AWS_ONBOARDING_VERIFY_QUERY_KEY],
    async () => {
      const { data: result, error } = await sendGetAwsOnboardingVerify();
      if (error || !result) {
        throw error instanceof Error ? error : new Error('Verification request failed');
      }
      return result;
    },
    { enabled: isConfigured, retry: false, refetchOnWindowFocus: false }
  );

  if (!isEnabled) {
    // Without the live credentials state, trust what the agent recorded on the attachment.
    return {
      kind: data.status === 'verify_failed' ? 'failed' : data.status,
      accountId: data.account_id,
      error: data.error,
    };
  }
  if (!isConfigured) {
    return { kind: 'pending' };
  }
  if (verify.error) {
    return { kind: 'failed', error: (verify.error as Error).message };
  }
  if (!verify.data) {
    return { kind: 'configured' };
  }

  const { accountId, discovery, provisioning } = verify.data;
  const failure = [discovery, provisioning].find((check) => check && !check.ok);
  if (failure) {
    return { kind: 'failed', error: failure.error };
  }
  return { kind: 'verified', accountId };
};

const getStatusText = ({ kind, accountId }: CardStatus): string => {
  switch (kind) {
    case 'verified':
      return accountId
        ? i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.statusVerified', {
            defaultMessage: 'Status: verified for account {accountId}',
            values: { accountId },
          })
        : i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.statusVerifiedNoAccount', {
            defaultMessage: 'Status: access verified',
          });
    case 'configured':
      return i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.statusConfigured', {
        defaultMessage: 'Status: configured',
      });
    case 'failed':
      return i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.statusFailed', {
        defaultMessage: 'Status: verification failed',
      });
    default:
      return i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.statusPending', {
        defaultMessage: 'Status: pending',
      });
  }
};

export const AwsOnboardingCredentialsCard: React.FC<{
  data: AwsOnboardingCredentialsAttachmentData;
}> = ({ data }) => {
  const { notifications } = useStartServices();
  const status = useCardStatus(data);

  const onDownload = useCallback(async () => {
    try {
      await downloadBootstrapTemplate();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadError', {
          defaultMessage: 'Failed to download the bootstrap template',
        }),
      });
    }
  }, [notifications.toasts]);

  const statusText = getStatusText(status);

  return (
    <>
      <EuiSteps
        titleSize="xxs"
        steps={[
          {
            title: i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadStep', {
              defaultMessage: 'Download the bootstrap template',
            }),
            children: (
              <EuiButton
                size="s"
                iconType="download"
                onClick={onDownload}
                data-test-subj="awsOnboardingCredentialsCardDownload"
              >
                {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadButton', {
                  defaultMessage: 'Download template',
                })}
              </EuiButton>
            ),
          },
          {
            title: i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.consoleStep', {
              defaultMessage: 'Create the stack in CloudFormation',
            }),
            children: (
              <EuiText size="s">
                <p>
                  <EuiLink
                    external
                    target="_blank"
                    href={`https://console.aws.amazon.com/cloudformation/home?region=${encodeURIComponent(
                      data.region
                    )}#/stacks/create`}
                    data-test-subj="awsOnboardingCredentialsCardConsoleLink"
                  >
                    {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.consoleLink', {
                      defaultMessage: 'Open CloudFormation console',
                    })}
                  </EuiLink>
                </p>
                <p>
                  {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.consoleNote', {
                    defaultMessage:
                      'Upload the file, create the stack, then copy the stack Outputs and the secret from Secrets Manager.',
                  })}
                </p>
              </EuiText>
            ),
          },
          {
            title: i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.enterStep', {
              defaultMessage: 'Enter the stack outputs',
            }),
            children: (
              <EuiText size="s">
                {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.enterStepText', {
                  defaultMessage: 'Enter the stack outputs with the button above.',
                })}
              </EuiText>
            ),
          },
        ]}
      />
      <EuiSpacer size="s" />
      <EuiText size="s" data-test-subj="awsOnboardingCredentialsCardStatus">
        {statusText}
      </EuiText>
      {status.kind === 'verified' && (
        <>
          <EuiSpacer size="s" />
          <KbnSuccessCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingCredentialsCardReplyDone"
            title={i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.replyDone', {
              defaultMessage: 'Go back to the assistant and reply done.',
            })}
          />
        </>
      )}
      {status.kind === 'failed' && status.error && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingCredentialsCardError"
            title={status.error}
          />
        </>
      )}
    </>
  );
};
