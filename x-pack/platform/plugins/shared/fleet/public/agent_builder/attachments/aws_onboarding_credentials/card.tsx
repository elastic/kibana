/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLink, EuiSteps, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';

import type { AwsOnboardingCredentialsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_credentials_attachment';
import {
  AWS_ONBOARDING_VERIFY_QUERY_KEY,
  useManagedOnboarding,
} from '../../../components/cloud_connector/hooks/use_managed_onboarding';
import { useStartServices } from '../../../hooks';
import {
  sendGetAwsOnboardingBootstrapLaunch,
  sendGetAwsOnboardingVerify,
} from '../../../hooks/use_request/aws_onboarding';
import { toRequestError } from '../../../hooks/use_request/errors';

import { downloadBootstrapTemplate } from './download_template';

const LAUNCH_QUERY_KEY = 'aws-onboarding-bootstrap-launch';

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
        throw toRequestError(error, 'Verification request failed');
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
  const { cloud, notifications } = useStartServices();
  const { isEnabled, isConfigured, isLoading: isCredentialsLoading } = useManagedOnboarding(cloud);
  const status = useCardStatus(data);

  const launch = useQuery(
    [LAUNCH_QUERY_KEY, 'fully-managed', data.region],
    async () => {
      const { data: result, error } = await sendGetAwsOnboardingBootstrapLaunch(
        'fully-managed',
        data.region
      );
      if (error || !result) {
        throw toRequestError(error, 'Failed to prepare the CloudFormation launch link');
      }
      return result;
    },
    {
      // Wait for the credentials state: a configured account never needs the bootstrap stack.
      enabled: isEnabled && !isCredentialsLoading && !isConfigured,
      staleTime: 0,
      refetchOnWindowFocus: true,
      // Refresh about a minute before the signed template URL expires, even while the tab keeps focus.
      refetchInterval: (result) =>
        result?.kind === 'quick_create'
          ? Math.max(new Date(result.expiresAt).getTime() - Date.now() - 60_000, 30_000)
          : false,
      retry: false,
    }
  );

  const statusText = getStatusText(status);

  const isDownload = launch.data?.kind === 'download';

  const handleDownload = async () => {
    try {
      await downloadBootstrapTemplate();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadError', {
          defaultMessage: 'Failed to download the bootstrap template',
        }),
      });
    }
  };

  const launchNote = (
    <EuiText size="s">
      {isDownload
        ? i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadNote', {
            defaultMessage:
              'Download the template, upload it in the CloudFormation console and create the stack, then copy the secret from Secrets Manager.',
          })
        : i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchNote', {
            defaultMessage:
              'Opens the AWS console with the Elastic bootstrap template pre-loaded. Create the stack, then copy the secret from Secrets Manager.',
          })}
    </EuiText>
  );

  let launchStepContent: React.ReactNode;
  if (isConfigured) {
    launchStepContent = (
      <EuiText size="s" data-test-subj="awsOnboardingCredentialsCardLaunchDone">
        {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchDone', {
          defaultMessage: 'Bootstrap stack created.',
        })}
      </EuiText>
    );
  } else if (!isEnabled) {
    launchStepContent = launchNote;
  } else {
    launchStepContent = (
      <>
        {launchNote}
        <EuiSpacer size="s" />
        {launch.error && !launch.data ? (
          <KbnWarningCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingCredentialsCardLaunchError"
            title={(launch.error as Error).message}
          />
        ) : launch.data?.kind === 'download' ? (
          <>
            <EuiButton
              size="s"
              iconType="download"
              onClick={handleDownload}
              data-test-subj="awsOnboardingCredentialsCardDownload"
            >
              {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadButton', {
                defaultMessage: 'Download template',
              })}
            </EuiButton>
            <EuiSpacer size="s" />
            <EuiText size="s">
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
            </EuiText>
          </>
        ) : (
          <>
            <EuiButton
              fill
              size="s"
              iconType="rocket"
              href={launch.data?.kind === 'quick_create' ? launch.data.quickCreateUrl : undefined}
              target="_blank"
              isLoading={launch.isLoading}
              isDisabled={!launch.data}
              data-test-subj="awsOnboardingCredentialsCardLaunch"
            >
              {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchButton', {
                defaultMessage: 'Launch in CloudFormation',
              })}
            </EuiButton>
            {launch.data?.kind === 'quick_create' &&
              !Number.isNaN(new Date(launch.data.expiresAt).getTime()) && (
                <EuiText size="xs" data-test-subj="awsOnboardingCredentialsCardLaunchExpiry">
                  <FormattedMessage
                    id="xpack.fleet.awsOnboardingCredentialsCard.launchExpiry"
                    defaultMessage="Link expires at {time}"
                    values={{ time: <FormattedTime value={launch.data.expiresAt} /> }}
                  />
                </EuiText>
              )}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <EuiSteps
        titleSize="xxs"
        steps={[
          {
            title: isDownload
              ? i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.downloadStep', {
                  defaultMessage: 'Create the stack in CloudFormation',
                })
              : i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchStep', {
                  defaultMessage: 'Launch in CloudFormation',
                }),
            status: isConfigured ? 'complete' : undefined,
            children: launchStepContent,
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
