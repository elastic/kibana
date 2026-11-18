/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

import type { AwsOnboardingStackAttachmentData } from '../../../../common/agent_builder/aws_onboarding_stack_attachment';
import type { GetAwsOnboardingStackResponse } from '../../../../common/types/rest_spec/aws_onboarding';
import { sendGetAwsOnboardingStack } from '../../../hooks/use_request/aws_onboarding';
import { toRequestError } from '../../../hooks/use_request/errors';

import { KNOWN_STACK_RESOURCES } from './resources';

const STACK_QUERY_KEY = 'aws-onboarding-stack';
const POLL_INTERVAL_MS = 5000;

type StackResource = GetAwsOnboardingStackResponse['resources'][number];
type ResourceState = 'pending' | 'in_progress' | 'complete' | 'failed' | 'deleted';

interface ResourceRow {
  logicalId: string;
  label: string;
  resource?: StackResource;
}

const toResourceState = (status: string | undefined): ResourceState => {
  if (!status) return 'pending';
  if (status.endsWith('_FAILED')) return 'failed';
  if (status.endsWith('_IN_PROGRESS')) return 'in_progress';
  // A resource removed while the stack rolls back.
  if (status === 'DELETE_COMPLETE') return 'deleted';
  return 'complete';
};

/**
 * A create lists every resource the blueprint makes, pending until reported; an update lists only
 * the resources it touches. Resources outside the blueprint are labelled with their logical id.
 */
const toRows = (
  action: AwsOnboardingStackAttachmentData['action'],
  resources: StackResource[]
): ResourceRow[] => {
  const reported = new Map(resources.map((resource) => [resource.logicalId, resource]));
  const known = KNOWN_STACK_RESOURCES.filter(
    ({ logicalId }) => action === 'create' || reported.has(logicalId)
  ).map(({ logicalId, label }) => ({ logicalId, label, resource: reported.get(logicalId) }));
  const knownIds = new Set(KNOWN_STACK_RESOURCES.map(({ logicalId }) => logicalId));
  const unknown = resources
    .filter(({ logicalId }) => !knownIds.has(logicalId))
    .map((resource) => ({ logicalId: resource.logicalId, label: resource.logicalId, resource }));
  return [...known, ...unknown];
};

const GLYPH_LABELS: Record<ResourceState, string> = {
  pending: i18n.translate('xpack.fleet.awsOnboardingStackCard.glyph.pending', {
    defaultMessage: 'Pending',
  }),
  in_progress: i18n.translate('xpack.fleet.awsOnboardingStackCard.glyph.inProgress', {
    defaultMessage: 'In progress',
  }),
  complete: i18n.translate('xpack.fleet.awsOnboardingStackCard.glyph.complete', {
    defaultMessage: 'Complete',
  }),
  failed: i18n.translate('xpack.fleet.awsOnboardingStackCard.glyph.failed', {
    defaultMessage: 'Failed',
  }),
  deleted: i18n.translate('xpack.fleet.awsOnboardingStackCard.glyph.deleted', {
    defaultMessage: 'Removed',
  }),
};

const GLYPH_ICONS: Record<
  Exclude<ResourceState, 'in_progress'>,
  { type: string; color: string }
> = {
  pending: { type: 'dot', color: 'subdued' },
  complete: { type: 'checkInCircleFilled', color: 'success' },
  failed: { type: 'errorFilled', color: 'danger' },
  deleted: { type: 'minusInCircle', color: 'subdued' },
};

const ResourceGlyph: React.FC<{ state: ResourceState }> = ({ state }) => {
  const testSubj = `awsOnboardingStackCardGlyph-${state}`;
  if (state === 'in_progress') {
    return (
      <EuiLoadingSpinner size="s" aria-label={GLYPH_LABELS[state]} data-test-subj={testSubj} />
    );
  }
  const { type, color } = GLYPH_ICONS[state];
  return (
    <EuiIcon type={type} color={color} aria-label={GLYPH_LABELS[state]} data-test-subj={testSubj} />
  );
};

const getBadge = (
  action: AwsOnboardingStackAttachmentData['action'],
  status: GetAwsOnboardingStackResponse['status']
): { color: EuiBadgeProps['color']; label: string } => {
  const isUpdate = action === 'update';
  switch (status) {
    case 'in_progress':
      return {
        color: 'primary',
        label: isUpdate
          ? i18n.translate('xpack.fleet.awsOnboardingStackCard.badge.updating', {
              defaultMessage: 'Updating',
            })
          : i18n.translate('xpack.fleet.awsOnboardingStackCard.badge.creating', {
              defaultMessage: 'Creating',
            }),
      };
    case 'complete':
      return {
        color: 'success',
        label: isUpdate
          ? i18n.translate('xpack.fleet.awsOnboardingStackCard.badge.updated', {
              defaultMessage: 'Updated',
            })
          : i18n.translate('xpack.fleet.awsOnboardingStackCard.badge.created', {
              defaultMessage: 'Created',
            }),
      };
    case 'failed':
      return {
        color: 'danger',
        label: i18n.translate('xpack.fleet.awsOnboardingStackCard.badge.failed', {
          defaultMessage: 'Failed',
        }),
      };
    default:
      return {
        color: 'hollow',
        label: i18n.translate('xpack.fleet.awsOnboardingStackCard.badge.notFound', {
          defaultMessage: 'Not found',
        }),
      };
  }
};

const formatElapsed = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}m ${seconds}s`;
};

/** Time since the stack started, re-rendered every second while `isRunning`. */
const useElapsed = (startedAt: string, isRunning: boolean): string | undefined => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);
  const started = new Date(startedAt).getTime();
  return isRunning && !Number.isNaN(started) ? formatElapsed(now - started) : undefined;
};

const getConsoleUrl = (region: string, stackId: string): string =>
  `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
    stackId
  )}`;

export const AwsOnboardingStackCard: React.FC<{ data: AwsOnboardingStackAttachmentData }> = ({
  data,
}) => {
  const {
    stack_id: stackId,
    stack_name: stackName,
    region,
    action,
    for_services: forServices,
    adding,
    started_at: startedAt,
  } = data;

  const stack = useQuery(
    [STACK_QUERY_KEY, stackId],
    async () => {
      const { data: result, error } = await sendGetAwsOnboardingStack(stackId);
      if (error || !result) {
        throw toRequestError(
          error,
          i18n.translate('xpack.fleet.awsOnboardingStackCard.readStatusError', {
            defaultMessage: 'Failed to read the stack status',
          })
        );
      }
      return result;
    },
    {
      // Poll only while CloudFormation is still working; a terminal or missing stack never changes.
      refetchInterval: (result) => (result?.status === 'in_progress' ? POLL_INTERVAL_MS : false),
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const status = stack.data?.status;
  const elapsed = useElapsed(startedAt, status === 'in_progress');
  const badge = status ? getBadge(action, status) : undefined;
  const rows = toRows(action, stack.data?.resources ?? []);

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {action === 'update'
                ? i18n.translate('xpack.fleet.awsOnboardingStackCard.titleUpdate', {
                    defaultMessage: 'Updating identity stack',
                  })
                : i18n.translate('xpack.fleet.awsOnboardingStackCard.titleCreate', {
                    defaultMessage: 'Federated Identity stack',
                  })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {badge && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={badge.color} data-test-subj="awsOnboardingStackCardBadge">
              {badge.label}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {elapsed && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {elapsed}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.fleet.awsOnboardingStackCard.subtitle', {
          defaultMessage: '{stackName} · {region} · {services}',
          values: { stackName, region, services: forServices.join(', ') },
        })}
      </EuiText>
      <EuiSpacer size="s" />

      {stack.isLoading && <EuiLoadingSpinner size="m" />}

      {stack.isError && !stack.data && (
        <KbnWarningCallout
          announceOnMount={false}
          size="s"
          data-test-subj="awsOnboardingStackCardError"
          title={(stack.error as Error).message}
        />
      )}

      {status === 'not_found' && (
        <EuiText size="s" data-test-subj="awsOnboardingStackCardNotFound">
          {i18n.translate('xpack.fleet.awsOnboardingStackCard.notFound', {
            defaultMessage: 'This stack no longer exists',
          })}
        </EuiText>
      )}

      {status && status !== 'not_found' && (
        <>
          {action === 'update' && adding && adding.length > 0 && (
            <>
              <EuiText size="s" data-test-subj="awsOnboardingStackCardAdding">
                {i18n.translate('xpack.fleet.awsOnboardingStackCard.adding', {
                  defaultMessage: 'Adding: {templates}',
                  values: { templates: adding.join(', ') },
                })}
              </EuiText>
              <EuiSpacer size="xs" />
            </>
          )}
          {rows.map(({ logicalId, label, resource }) => (
            <EuiFlexGroup
              key={logicalId}
              gutterSize="s"
              alignItems="flexStart"
              responsive={false}
              data-test-subj={`awsOnboardingStackCardResource-${logicalId}`}
            >
              <EuiFlexItem grow={false}>
                <ResourceGlyph state={toResourceState(resource?.status)} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  {label}
                  {label !== logicalId && (
                    <EuiText size="xs" color="subdued" component="span">
                      {` ${logicalId}`}
                    </EuiText>
                  )}
                </EuiText>
                {resource?.reason && (
                  <EuiText size="xs" color="danger">
                    {resource.reason}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </>
      )}

      {status === 'complete' && (
        <>
          <EuiSpacer size="s" />
          {stack.data?.outputs?.roleArn && (
            <EuiText size="s" data-test-subj="awsOnboardingStackCardRoleArn">
              {i18n.translate('xpack.fleet.awsOnboardingStackCard.roleArn', {
                defaultMessage: 'Role ARN:',
              })}{' '}
              <EuiCode>{stack.data.outputs.roleArn}</EuiCode>
            </EuiText>
          )}
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.fleet.awsOnboardingStackCard.next', {
              defaultMessage: 'Next: connector → policies → waiting for data',
            })}
          </EuiText>
        </>
      )}

      {status === 'failed' && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            announceOnMount={false}
            size="s"
            data-test-subj="awsOnboardingStackCardFailed"
            title={
              stack.data?.stackStatus
                ? i18n.translate('xpack.fleet.awsOnboardingStackCard.failedWithStatus', {
                    defaultMessage: 'The stack ended in {stackStatus}',
                    values: { stackStatus: stack.data.stackStatus },
                  })
                : i18n.translate('xpack.fleet.awsOnboardingStackCard.failed', {
                    defaultMessage: 'The stack failed',
                  })
            }
            text={stack.data?.reason}
          />
        </>
      )}

      {status !== 'not_found' && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <EuiLink
              external
              target="_blank"
              href={getConsoleUrl(region, stackId)}
              data-test-subj="awsOnboardingStackCardConsoleLink"
            >
              {i18n.translate('xpack.fleet.awsOnboardingStackCard.consoleLink', {
                defaultMessage: 'Open in the CloudFormation console',
              })}
            </EuiLink>
          </EuiText>
        </>
      )}
    </>
  );
};
