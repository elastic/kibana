/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { KbnWarningCallout } from '@kbn/ui-callout';

import type { AwsOnboardingRunAttachmentData } from '../../../../common/agent_builder/aws_onboarding_run_attachment';
import type {
  AwsOnboardingRunProgress,
  AwsOnboardingRunStackResource,
  AwsOnboardingRunStatus,
} from '../../../../common/types/rest_spec/aws_onboarding_run';
import { AWS_REGION_PATTERN } from '../../../../common/services/cloud_connectors/iac_deployment';
import { useStartServices } from '../../../hooks';
import { sendGetAwsOnboardingRun } from '../../../hooks/use_request/aws_onboarding';
import { toRequestError } from '../../../hooks/use_request/errors';

import { KNOWN_STACK_RESOURCES } from './resources';

const RUN_QUERY_KEY = 'aws-onboarding-run';
const POLL_INTERVAL_MS = 5000;

/** The engine's terminal statuses; the run's progress never changes after one of them. */
const ENDED_STATUSES = new Set<AwsOnboardingRunStatus>([
  'completed',
  'failed',
  'cancelled',
  'timed_out',
  'skipped',
]);

const isRunning = (status: AwsOnboardingRunStatus | undefined): boolean =>
  status !== undefined && !ENDED_STATUSES.has(status);

type GlyphState = 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped';

const GLYPH_LABELS: Record<GlyphState, string> = {
  pending: i18n.translate('xpack.fleet.awsOnboardingRunCard.glyph.pending', {
    defaultMessage: 'Pending',
  }),
  in_progress: i18n.translate('xpack.fleet.awsOnboardingRunCard.glyph.inProgress', {
    defaultMessage: 'In progress',
  }),
  complete: i18n.translate('xpack.fleet.awsOnboardingRunCard.glyph.complete', {
    defaultMessage: 'Complete',
  }),
  failed: i18n.translate('xpack.fleet.awsOnboardingRunCard.glyph.failed', {
    defaultMessage: 'Failed',
  }),
  skipped: i18n.translate('xpack.fleet.awsOnboardingRunCard.glyph.skipped', {
    defaultMessage: 'Skipped',
  }),
};

const GLYPH_CHARACTERS: Record<Exclude<GlyphState, 'in_progress'>, string> = {
  pending: '●',
  complete: '✓',
  failed: '✕',
  skipped: '–',
};

/**
 * A text glyph in a fixed-width slot, so labels line up whether or not an icon font is loaded in
 * the conversation.
 */
const Glyph: React.FC<{ state: GlyphState }> = ({ state }) => {
  const { euiTheme } = useEuiTheme();
  const color = {
    pending: euiTheme.colors.textSubdued,
    in_progress: euiTheme.colors.textSubdued,
    complete: euiTheme.colors.textSuccess,
    failed: euiTheme.colors.textDanger,
    skipped: euiTheme.colors.textSubdued,
  }[state];
  const slot = css`
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: ${euiTheme.size.l};
    color: ${color};
  `;
  if (state === 'in_progress') {
    return (
      <span css={slot}>
        <EuiLoadingSpinner size="s" aria-label={GLYPH_LABELS[state]} />
      </span>
    );
  }
  return (
    <span css={slot} role="img" aria-label={GLYPH_LABELS[state]}>
      {GLYPH_CHARACTERS[state]}
    </span>
  );
};

const Line: React.FC<{
  state: GlyphState;
  testSubj?: string;
  size?: 's' | 'xs';
  children: React.ReactNode;
}> = ({ state, testSubj, size = 's', children }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} data-test-subj={testSubj}>
    <EuiFlexItem grow={false}>
      <Glyph state={state} />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size={size} color={state === 'pending' ? 'subdued' : undefined}>
        {children}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const Row: React.FC<{
  title: string;
  state: GlyphState;
  testSubj: string;
  children: React.ReactNode;
}> = ({ title, state, testSubj, children }) => (
  <EuiFlexItem data-test-subj={testSubj}>
    <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <Glyph state={state} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxxs">
          <h5>{title}</h5>
        </EuiTitle>
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);

const toResourceState = (status: string | undefined): GlyphState => {
  if (!status) return 'pending';
  if (status.endsWith('_FAILED')) return 'failed';
  if (status.endsWith('_IN_PROGRESS')) return 'in_progress';
  // A resource removed while the stack rolls back.
  if (status === 'DELETE_COMPLETE') return 'skipped';
  return 'complete';
};

/** The five blueprint resources by label, pending until reported, then any others by logical id. */
const toResourceRows = (
  resources: AwsOnboardingRunStackResource[]
): Array<{ logicalId: string; label: string; resource?: AwsOnboardingRunStackResource }> => {
  const reported = new Map(resources.map((resource) => [resource.logicalId, resource]));
  const knownIds = new Set(KNOWN_STACK_RESOURCES.map(({ logicalId }) => logicalId));
  return [
    ...KNOWN_STACK_RESOURCES.map(({ logicalId, label }) => ({
      logicalId,
      label,
      resource: reported.get(logicalId),
    })),
    ...resources
      .filter(({ logicalId }) => !knownIds.has(logicalId))
      .map((resource) => ({ logicalId: resource.logicalId, label: resource.logicalId, resource })),
  ];
};

const getBadge = (
  progress: AwsOnboardingRunProgress
): { color: EuiBadgeProps['color']; label: string } => {
  if (isRunning(progress.status)) {
    return {
      color: 'hollow',
      label: i18n.translate('xpack.fleet.awsOnboardingRunCard.badge.running', {
        defaultMessage: 'Running',
      }),
    };
  }
  if (progress.status !== 'completed') {
    return {
      color: 'danger',
      label: i18n.translate('xpack.fleet.awsOnboardingRunCard.badge.failed', {
        defaultMessage: 'Failed',
      }),
    };
  }
  return progress.data.phase === 'partial'
    ? {
        color: 'warning',
        label: i18n.translate('xpack.fleet.awsOnboardingRunCard.badge.donePartial', {
          defaultMessage: 'Done, partial',
        }),
      }
    : {
        color: 'success',
        label: i18n.translate('xpack.fleet.awsOnboardingRunCard.badge.done', {
          defaultMessage: 'Done',
        }),
      };
};

const formatDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
};

/** Time since the run started, re-rendered every second while `running`. */
const useElapsed = (startedAt: string, running: boolean): string | undefined => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const started = new Date(startedAt).getTime();
  return running && !Number.isNaN(started) ? formatDuration((now - started) / 1000) : undefined;
};

/**
 * A reused identity's stack can live in another region than the run, so its ARN decides.
 * The segment becomes the console host, so anything that is not a region falls back.
 */
const getStackRegion = (stackId: string, fallback: string): string => {
  const region = stackId.split(':')[3];
  return region && AWS_REGION_PATTERN.test(region) ? region : fallback;
};

const getConsoleUrl = (region: string, stackId: string): string =>
  `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
    stackId
  )}`;

const failedWith = (reason: string | undefined): string =>
  reason
    ? i18n.translate('xpack.fleet.awsOnboardingRunCard.failedWithReason', {
        defaultMessage: 'Failed: {reason}',
        values: { reason },
      })
    : i18n.translate('xpack.fleet.awsOnboardingRunCard.failed', { defaultMessage: 'Failed' });

const StackRow: React.FC<{
  stack: AwsOnboardingRunProgress['stack'];
  error?: string;
  data: AwsOnboardingRunAttachmentData;
}> = ({ stack, error, data }) => {
  const isUpdate = data.stack_action === 'update';
  const name = stack.stack_name ?? '';
  const { phase } = stack;

  let text: string;
  if (phase === 'pending') {
    text = i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.pending', {
      defaultMessage: 'Waiting to start',
    });
  } else if (phase === 'in_progress') {
    text = isUpdate
      ? i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.updating', {
          defaultMessage: 'Updating {name}',
          values: { name },
        })
      : i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.creating', {
          defaultMessage: 'Creating {name}',
          values: { name },
        });
  } else if (phase === 'complete') {
    text = isUpdate
      ? i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.updated', {
          defaultMessage: 'Updated {name}',
          values: { name },
        })
      : i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.created', {
          defaultMessage: 'Created {name}',
          values: { name },
        });
  } else if (phase === 'skipped') {
    text = i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.noChange', {
      defaultMessage: 'No change needed',
    });
  } else {
    text = failedWith(stack.reason ?? error);
  }

  return (
    <Row
      title={i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.title', {
        defaultMessage: 'Identity stack',
      })}
      state={phase}
      testSubj="awsOnboardingRunCardStack"
    >
      <EuiText size="s">{text}</EuiText>
      {phase === 'in_progress' && (
        <>
          {isUpdate && data.adding && data.adding.length > 0 && (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.adding', {
                defaultMessage: 'Adding: {templates}',
                values: { templates: data.adding.join(', ') },
              })}
            </EuiText>
          )}
          {toResourceRows(stack.resources).map(({ logicalId, label, resource }) => (
            <Line
              key={logicalId}
              size="xs"
              state={toResourceState(resource?.status)}
              testSubj={`awsOnboardingRunCardResource-${logicalId}`}
            >
              {label}
              {resource?.reason && ` · ${resource.reason}`}
            </Line>
          ))}
        </>
      )}
      {/* A failed stack must be read and deleted in the console before a retry. */}
      {(phase === 'complete' || phase === 'failed') && stack.stack_id && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          target="_blank"
          href={getConsoleUrl(getStackRegion(stack.stack_id, data.region), stack.stack_id)}
          data-test-subj="awsOnboardingRunCardConsoleLink"
        >
          {i18n.translate('xpack.fleet.awsOnboardingRunCard.stack.consoleLink', {
            defaultMessage: 'Open in CloudFormation',
          })}
        </EuiButtonEmpty>
      )}
    </Row>
  );
};

const ConnectorRow: React.FC<{ connector: AwsOnboardingRunProgress['connector'] }> = ({
  connector,
}) => {
  const name = connector.name ?? connector.cloud_connector_id ?? '';
  const { phase } = connector;
  const text = {
    pending: i18n.translate('xpack.fleet.awsOnboardingRunCard.connector.pending', {
      defaultMessage: 'Waiting for the stack',
    }),
    complete: i18n.translate('xpack.fleet.awsOnboardingRunCard.connector.created', {
      defaultMessage: 'Created {name}',
      values: { name },
    }),
    reused: i18n.translate('xpack.fleet.awsOnboardingRunCard.connector.reused', {
      defaultMessage: 'Reusing {name}',
      values: { name },
    }),
    failed: failedWith(undefined),
  }[phase];
  return (
    <Row
      title={i18n.translate('xpack.fleet.awsOnboardingRunCard.connector.title', {
        defaultMessage: 'Cloud connector',
      })}
      state={phase === 'reused' ? 'complete' : phase}
      testSubj="awsOnboardingRunCardConnector"
    >
      <EuiText size="s">{text}</EuiText>
    </Row>
  );
};

const PoliciesRow: React.FC<{ policies: AwsOnboardingRunProgress['policies']; error?: string }> = ({
  policies,
  error,
}) => {
  const { phase, items } = policies;
  const itemText = {
    in_progress: i18n.translate('xpack.fleet.awsOnboardingRunCard.policies.creating', {
      defaultMessage: 'Creating',
    }),
    complete: i18n.translate('xpack.fleet.awsOnboardingRunCard.policies.created', {
      defaultMessage: 'Created',
    }),
    failed: failedWith(error),
  };
  return (
    <Row
      title={i18n.translate('xpack.fleet.awsOnboardingRunCard.policies.title', {
        defaultMessage: 'Policies',
      })}
      state={phase}
      testSubj="awsOnboardingRunCardPolicies"
    >
      {phase === 'pending' ? (
        <EuiText size="s">
          {i18n.translate('xpack.fleet.awsOnboardingRunCard.policies.pending', {
            defaultMessage: 'Waiting',
          })}
        </EuiText>
      ) : (
        items.map(({ service, name }) => (
          <EuiText key={service} size="s" data-test-subj={`awsOnboardingRunCardPolicy-${service}`}>
            {`${name ?? service} · ${itemText[phase]}`}
          </EuiText>
        ))
      )}
    </Row>
  );
};

const DataRow: React.FC<{
  data: AwsOnboardingRunProgress['data'];
  items: AwsOnboardingRunProgress['policies']['items'];
}> = ({ data, items }) => {
  const { phase } = data;
  let text: string;
  if (phase === 'waiting') {
    text = i18n.translate('xpack.fleet.awsOnboardingRunCard.data.waiting', {
      defaultMessage: 'Waiting · {waited} of up to 20m',
      values: { waited: formatDuration(data.waited_seconds ?? 0) },
    });
  } else if (phase === 'complete') {
    text = i18n.translate('xpack.fleet.awsOnboardingRunCard.data.arriving', {
      defaultMessage: '{services} data is arriving',
      values: {
        services: items
          .filter(({ has_data: hasData }) => hasData !== false)
          .map(({ service }) => service)
          .join(', '),
      },
    });
  } else if (phase === 'partial') {
    text = i18n.translate('xpack.fleet.awsOnboardingRunCard.data.partial', {
      defaultMessage: 'No data yet for {services}',
      values: {
        services: items
          .filter(({ has_data: hasData }) => hasData === false)
          .map(({ service }) => service)
          .join(', '),
      },
    });
  } else if (phase === 'failed') {
    text = failedWith(undefined);
  } else {
    text = i18n.translate('xpack.fleet.awsOnboardingRunCard.data.pending', {
      defaultMessage: 'Waiting for the policies',
    });
  }
  const state: GlyphState =
    phase === 'waiting' ? 'in_progress' : phase === 'partial' ? 'complete' : phase;
  return (
    <Row
      title={i18n.translate('xpack.fleet.awsOnboardingRunCard.data.title', {
        defaultMessage: 'Data arriving',
      })}
      state={state}
      testSubj="awsOnboardingRunCardData"
    >
      <EuiText size="s">{text}</EuiText>
    </Row>
  );
};

/** The whole onboarding run, read live from the run route until the run ends. */
export const AwsOnboardingRunCard: React.FC<{ data: AwsOnboardingRunAttachmentData }> = ({
  data,
}) => {
  const {
    execution_id: executionId,
    region,
    for_services: forServices,
    started_at: startedAt,
  } = data;
  const { http } = useStartServices();

  const run = useQuery(
    [RUN_QUERY_KEY, executionId],
    async () => {
      const { data: result, error } = await sendGetAwsOnboardingRun(executionId);
      if (error || !result) {
        throw toRequestError(
          error,
          i18n.translate('xpack.fleet.awsOnboardingRunCard.readError', {
            defaultMessage: 'Failed to read the onboarding run',
          })
        );
      }
      return result;
    },
    {
      // Poll only while the run can still move; an ended run never changes. Until a first
      // read succeeds there is nothing to judge, so a failed first read is retried.
      refetchInterval: (result) =>
        result === undefined || isRunning(result.status) ? POLL_INTERVAL_MS : false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const progress = run.data;
  const elapsed = useElapsed(startedAt, isRunning(progress?.status));
  const badge = progress ? getBadge(progress) : undefined;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.fleet.awsOnboardingRunCard.title', {
                defaultMessage: 'AWS onboarding run',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {badge && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={badge.color} data-test-subj="awsOnboardingRunCardBadge">
              {badge.label}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {elapsed && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="awsOnboardingRunCardElapsed">
              {elapsed}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.fleet.awsOnboardingRunCard.subtitle', {
          defaultMessage: '{region} · {services}',
          values: { region, services: forServices.join(', ') },
        })}
      </EuiText>

      <EuiPanel paddingSize="m" hasBorder={false}>
        {run.isLoading && <EuiLoadingSpinner size="m" />}

        {run.isError && !progress && (
          <KbnWarningCallout
            announceOnMount={false}
            size="s"
            data-test-subj="awsOnboardingRunCardError"
            title={(run.error as Error).message}
          />
        )}

        {progress && (
          <EuiFlexGroup direction="column" gutterSize="m">
            <StackRow stack={progress.stack} error={progress.error} data={data} />
            <ConnectorRow connector={progress.connector} />
            <PoliciesRow policies={progress.policies} error={progress.error} />
            <DataRow data={progress.data} items={progress.policies.items} />
            {progress.dashboard_path && (
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiLink
                    href={http.basePath.prepend(progress.dashboard_path)}
                    data-test-subj="awsOnboardingRunCardDashboardLink"
                  >
                    {i18n.translate('xpack.fleet.awsOnboardingRunCard.dashboardLink', {
                      defaultMessage: 'Open the AWS dashboard',
                    })}
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </>
  );
};
