/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSteps, EuiText, EuiSpacer } from '@elastic/eui';
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
  const { cloud } = useStartServices();
  const { isEnabled, isConfigured, isLoading: isCredentialsLoading } = useManagedOnboarding(cloud);
  const status = useCardStatus(data);

  const launch = useQuery(
    [LAUNCH_QUERY_KEY, 'fully-managed'],
    async () => {
      const { data: result, error } = await sendGetAwsOnboardingBootstrapLaunch('fully-managed');
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
      retry: false,
    }
  );

  const statusText = getStatusText(status);

  return (
    <>
      <EuiSteps
        titleSize="xxs"
        steps={[
          {
            title: i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchStep', {
              defaultMessage: 'Launch in CloudFormation',
            }),
            children: (
              <>
                <EuiText size="s">
                  {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchNote', {
                    defaultMessage:
                      'Opens the AWS console with the Elastic bootstrap template pre-loaded. Create the stack, then copy the secret from Secrets Manager.',
                  })}
                </EuiText>
                <EuiSpacer size="s" />
                {launch.error ? (
                  <KbnWarningCallout
                    announceOnMount={false}
                    data-test-subj="awsOnboardingCredentialsCardLaunchError"
                    title={(launch.error as Error).message}
                  />
                ) : (
                  <>
                    <EuiButton
                      fill
                      size="s"
                      iconType="rocket"
                      href={launch.data?.quickCreateUrl}
                      target="_blank"
                      isLoading={launch.isFetching}
                      isDisabled={!launch.data}
                      data-test-subj="awsOnboardingCredentialsCardLaunch"
                    >
                      {i18n.translate('xpack.fleet.awsOnboardingCredentialsCard.launchButton', {
                        defaultMessage: 'Launch in CloudFormation',
                      })}
                    </EuiButton>
                    {launch.data && !Number.isNaN(new Date(launch.data.expiresAt).getTime()) && (
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
