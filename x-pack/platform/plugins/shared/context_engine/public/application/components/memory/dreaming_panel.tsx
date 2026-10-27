/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID } from '@kbn/management-settings-ids';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_FEATURE_ID, uiPrivileges } from '../../../../common/features';
import type {
  MemoryDreamingStatusResponse,
  MemoryDreamingTypeRunStatus,
} from '../../../../common/http_api/memory';
import { useKibana } from '../../hooks/use_kibana';
import {
  useMemoryDreamingStatus,
  useRunMemoryDreaming,
  useSetMemoryDreaming,
} from '../../hooks/use_memory_dreaming';
import { getErrorMessage } from '../../utils/get_error_message';
import { KiFormattedDate } from '../ki/shared/ki_formatted_date';

const notYetLabel = i18n.translate('xpack.contextEngine.memory.dreaming.notYet', {
  defaultMessage: 'Not yet',
});

const unknownUserLabel = i18n.translate('xpack.contextEngine.memory.dreaming.unknownUser', {
  defaultMessage: 'Unknown user',
});

const formatDate = (value: string | undefined) =>
  value ? <KiFormattedDate value={value} /> : notYetLabel;

const longTermTypeLabels: Record<string, string> = {
  'memory.fact': i18n.translate('xpack.contextEngine.memory.dreaming.type.facts', {
    defaultMessage: 'Facts',
  }),
  'memory.entity': i18n.translate('xpack.contextEngine.memory.dreaming.type.entities', {
    defaultMessage: 'Entities',
  }),
  'memory.procedure': i18n.translate('xpack.contextEngine.memory.dreaming.type.procedures', {
    defaultMessage: 'Procedures',
  }),
  'memory.relationship': i18n.translate('xpack.contextEngine.memory.dreaming.type.relationships', {
    defaultMessage: 'Relationships',
  }),
};

const LastRunTypes = ({ types }: { types: Record<string, MemoryDreamingTypeRunStatus> }) => (
  <EuiText size="xs" color="subdued">
    <ul data-test-subj="contextMemoryDreamingLastRunTypes">
      {Object.entries(types).map(([type, run]) => (
        <li key={type}>
          {run.error
            ? i18n.translate('xpack.contextEngine.memory.dreaming.typeRunFailed', {
                defaultMessage:
                  '{type}: failed after {read, plural, one {# short-term memory} other {# short-term memories}}',
                values: { type: longTermTypeLabels[type] ?? type, read: run.memories_read },
              })
            : i18n.translate('xpack.contextEngine.memory.dreaming.typeRun', {
                defaultMessage:
                  '{type}: read {read}, made {applied, plural, one {# change} other {# changes}}, skipped {skipped}',
                values: {
                  type: longTermTypeLabels[type] ?? type,
                  read: run.memories_read,
                  applied: run.applied,
                  skipped: run.skipped,
                },
              })}
        </li>
      ))}
    </ul>
  </EuiText>
);

const getSettingsItems = (
  status: MemoryDreamingStatusResponse,
  settingsHref: string
): NonNullable<EuiDescriptionListProps['listItems']> => [
  {
    title: i18n.translate('xpack.contextEngine.memory.dreaming.turnedOnBy', {
      defaultMessage: 'Turned on by',
    }),
    description: status.enabled_by?.username ?? status.enabled_by?.id ?? unknownUserLabel,
  },
  {
    title: i18n.translate('xpack.contextEngine.memory.dreaming.turnedOnAt', {
      defaultMessage: 'Turned on',
    }),
    description: formatDate(status.enabled_at),
  },
  ...(status.scheduled !== false
    ? [
        {
          title: i18n.translate('xpack.contextEngine.memory.dreaming.interval', {
            defaultMessage: 'Runs every',
          }),
          description: (
            <>
              {status.interval}{' '}
              <EuiLink href={settingsHref} data-test-subj="contextMemoryDreamingIntervalLink">
                <FormattedMessage
                  id="xpack.contextEngine.memory.dreaming.changeInterval"
                  defaultMessage="Change in Advanced Settings"
                />
              </EuiLink>
            </>
          ),
        },
      ]
    : []),
];

const getHistoryItems = (
  status: MemoryDreamingStatusResponse
): NonNullable<EuiDescriptionListProps['listItems']> => [
  ...(status.enabled || status.last_dream_at
    ? [
        {
          title: i18n.translate('xpack.contextEngine.memory.dreaming.lastDream', {
            defaultMessage: 'Last dream',
          }),
          description: formatDate(status.last_dream_at),
        },
      ]
    : []),
  ...(status.last_run_status !== 'failed' && status.last_run_memories_read !== undefined
    ? [
        {
          title: i18n.translate('xpack.contextEngine.memory.dreaming.lastRunResult', {
            defaultMessage: 'Last run',
          }),
          description: (
            <>
              {i18n.translate('xpack.contextEngine.memory.dreaming.lastRunResultDescription', {
                defaultMessage:
                  'Read {read, plural, one {# short-term memory} other {# short-term memories}} in {batches, plural, one {# batch} other {# batches}}, made {applied, plural, one {# change} other {# changes}}, skipped {skipped, plural, one {# proposed change} other {# proposed changes}}',
                values: {
                  read: status.last_run_memories_read,
                  batches: Object.values(status.last_run_types ?? {}).reduce(
                    (sum, { batches }) => sum + batches,
                    0
                  ),
                  applied: status.last_run_applied ?? 0,
                  skipped: status.last_run_skipped ?? 0,
                },
              })}
              {Object.keys(status.last_run_types ?? {}).length > 1 && (
                <LastRunTypes types={status.last_run_types ?? {}} />
              )}
            </>
          ),
        },
      ]
    : []),
  ...(status.enabled && status.catching_up
    ? [
        {
          title: i18n.translate('xpack.contextEngine.memory.dreaming.catchingUp', {
            defaultMessage: 'Catching up',
          }),
          description:
            status.pending_memories !== undefined
              ? i18n.translate('xpack.contextEngine.memory.dreaming.catchingUpPending', {
                  defaultMessage:
                    'About {pending, plural, one {# short-term memory} other {# short-term memories}} left. The next run starts within a minute.',
                  values: { pending: status.pending_memories },
                })
              : i18n.translate('xpack.contextEngine.memory.dreaming.catchingUpDescription', {
                  defaultMessage: 'The next run starts within a minute.',
                }),
        },
      ]
    : []),
  ...(status.enabled && status.scheduled !== false && !status.catching_up
    ? [
        {
          title: i18n.translate('xpack.contextEngine.memory.dreaming.nextRun', {
            defaultMessage: 'Next run',
          }),
          description: formatDate(status.next_run_at),
        },
      ]
    : []),
];

const useStatusItems = (
  status: MemoryDreamingStatusResponse | undefined,
  settingsHref: string
): NonNullable<EuiDescriptionListProps['listItems']> =>
  useMemo(
    () =>
      status
        ? [
            ...(status.enabled ? getSettingsItems(status, settingsHref) : []),
            ...getHistoryItems(status),
          ]
        : [],
    [settingsHref, status]
  );

export const DreamingPanel = () => {
  const {
    services: { application },
  } = useKibana();
  const canWrite =
    application.capabilities[CONTEXT_ENGINE_FEATURE_ID]?.[uiPrivileges.write] === true;
  const { status, isLoading, error } = useMemoryDreamingStatus();
  const { setDreaming, isSaving } = useSetMemoryDreaming();
  const { runDream, isStarting } = useRunMemoryDreaming();
  const running = status?.running === true;
  const controlsDisabled = !canWrite || isSaving || isStarting || running;
  const settingsHref = application.getUrlForApp('management', {
    path: `/kibana/settings?query=${CONTEXT_ENGINE_MEMORY_DREAMING_INTERVAL_SETTING_ID}`,
  });
  const statusItems = useStatusItems(status, settingsHref);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextMemoryDreamingPanel">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.memory.dreaming.title"
                defaultMessage="Dreaming"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.memory.dreaming.description"
                defaultMessage="Dreaming turns the short-term memories in this space into long-term memories: facts, entities, procedures and the relationships between them. It runs on a schedule or when you select Dream now, and calls the model as the user who last turned it on or changed its schedule."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiSkeletonText
              lines={1}
              data-test-subj="contextMemoryDreamingLoading"
              css={{ width: 100 }}
            />
          ) : (
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.contextEngine.memory.dreaming.toggle"
                  defaultMessage="Turn on dreaming"
                />
              }
              checked={status?.enabled ?? false}
              onChange={({ target: { checked } }) =>
                setDreaming({ enabled: checked, scheduled: true })
              }
              disabled={controlsDisabled || error !== undefined}
              data-test-subj="contextMemoryDreamingToggle"
              compressed
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {status?.enabled && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="xpack.contextEngine.memory.dreaming.scheduleToggle"
                    defaultMessage="Run on a schedule"
                  />
                }
                checked={status.scheduled !== false}
                onChange={({ target: { checked } }) =>
                  setDreaming({ enabled: true, scheduled: checked, rebuild: status.rebuild })
                }
                disabled={controlsDisabled}
                data-test-subj="contextMemoryDreamingScheduleToggle"
                compressed
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.contextEngine.memory.dreaming.rebuildToggleHint"
                    defaultMessage="Temporary, for testing. While on, every dream deletes this space's long-term memories and rebuilds them from all short-term memories."
                  />
                }
              >
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.contextEngine.memory.dreaming.rebuildToggle"
                      defaultMessage="Rebuild from all short-term memories"
                    />
                  }
                  checked={status.rebuild === true}
                  onChange={({ target: { checked } }) =>
                    setDreaming({
                      enabled: true,
                      scheduled: status.scheduled !== false,
                      rebuild: checked,
                    })
                  }
                  disabled={controlsDisabled}
                  data-test-subj="contextMemoryDreamingRebuildToggle"
                  compressed
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="play"
                onClick={runDream}
                isLoading={isStarting || running}
                disabled={controlsDisabled}
                data-test-subj="contextMemoryDreamingRunNow"
              >
                {running ? (
                  <FormattedMessage
                    id="xpack.contextEngine.memory.dreaming.running"
                    defaultMessage="Dreaming…"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.contextEngine.memory.dreaming.runNow"
                    defaultMessage="Dream now"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {status.rebuild && (
            <>
              <EuiSpacer size="m" />
              <KbnWarningCallout
                size="s"
                title={i18n.translate('xpack.contextEngine.memory.dreaming.rebuildOn', {
                  defaultMessage:
                    "Every dream deletes this space's long-term memories and rebuilds them from all short-term memories",
                })}
                data-test-subj="contextMemoryDreamingRebuildOn"
              />
            </>
          )}
        </>
      )}
      {error && (
        <>
          <EuiSpacer size="m" />
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.contextEngine.memory.dreaming.loadError', {
              defaultMessage: 'Unable to load the dreaming status',
            })}
            text={<p>{getErrorMessage(error)}</p>}
            data-test-subj="contextMemoryDreamingError"
          />
        </>
      )}
      {status?.enabled &&
        (status.last_run_status === 'failed' || status.last_run_status === 'partial') && (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              announceOnMount
              size="s"
              title={
                status.last_run_status === 'partial'
                  ? i18n.translate('xpack.contextEngine.memory.dreaming.lastRunPartlyFailed', {
                      defaultMessage: 'Part of the last dream failed',
                    })
                  : i18n.translate('xpack.contextEngine.memory.dreaming.lastRunFailed', {
                      defaultMessage: 'The last dream failed',
                    })
              }
              text={
                <>
                  {status.last_error && <p>{status.last_error}</p>}
                  <p>
                    <FormattedMessage
                      id="xpack.contextEngine.memory.dreaming.lastRunFailedHint"
                      defaultMessage="If the user who turned dreaming on no longer has access, turn it off and on again to run it as you."
                    />
                  </p>
                </>
              }
              data-test-subj="contextMemoryDreamingLastRunFailed"
            />
          </>
        )}
      {statusItems.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={statusItems}
            data-test-subj="contextMemoryDreamingStatus"
          />
        </>
      )}
    </EuiPanel>
  );
};
