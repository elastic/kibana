/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_BUDGET_GROUPS_BY_ENGINE,
  RUN_QUOTA_ENGINE_IDS,
  type RunBudgetGroupId,
  type RunBudgetGroupUsage,
  type RunLimit,
  type RunQuotaEngineId,
} from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useUpdateRunQuotas,
} from '../../../../hooks/use_significant_events_run_quotas';

const SECTION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.settings.runLimits.title',
  { defaultMessage: 'Daily run limits' }
);

const SECTION_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.settings.runLimits.description',
  {
    defaultMessage:
      'Cap how many times each group of AI workflows runs per day across the whole deployment. Once a group reaches its limit, its automated runs stop early until the counter resets; runs you start yourself still go through (and still count). Limits are enforced by the workflows themselves, so a change applies from their next run.',
  }
);

const ENGINE_LABELS: Record<RunQuotaEngineId, string> = {
  context: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.engine.context',
    { defaultMessage: 'Context engine' }
  ),
  detection: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.engine.detection',
    { defaultMessage: 'Detection engine' }
  ),
  investigation: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.engine.investigation',
    { defaultMessage: 'Investigation engine' }
  ),
};

const GROUP_LABELS: Record<RunBudgetGroupId, string> = {
  ki_extraction: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.group.kiExtraction',
    { defaultMessage: 'Knowledge indicator extraction' }
  ),
  memory: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.group.memory',
    {
      defaultMessage: 'Memory updates',
    }
  ),
  detection: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.group.detection',
    { defaultMessage: 'Discovery and significant event generation' }
  ),
  investigation: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.group.investigation',
    { defaultMessage: 'Investigations' }
  ),
};

const GROUP_DESCRIPTIONS: Record<RunBudgetGroupId, string> = {
  ki_extraction: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.groupHelp.kiExtraction',
    { defaultMessage: 'Onboarding runs that extract knowledge indicators from a stream.' }
  ),
  memory: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.groupHelp.memory',
    {
      defaultMessage:
        'Synthesis, consolidation, gap detection, and conversation scraping runs share this counter.',
    }
  ),
  detection: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.groupHelp.detection',
    { defaultMessage: 'Discovery runs that turn detections into significant events.' }
  ),
  investigation: i18n.translate(
    'xpack.streams.significantEventsDiscovery.settings.runLimits.groupHelp.investigation',
    { defaultMessage: 'Investigation runs, whether triggered by triage or by a person.' }
  ),
};

const usageText = ({ used, limit }: { used: number; limit: RunLimit }) =>
  limit.enabled
    ? i18n.translate('xpack.streams.significantEventsDiscovery.settings.runLimits.usageOfLimit', {
        defaultMessage: '{used} of {max} runs used today',
        values: { used, max: limit.max },
      })
    : i18n.translate('xpack.streams.significantEventsDiscovery.settings.runLimits.usageUnlimited', {
        defaultMessage: '{used} runs today (no limit)',
        values: { used },
      });

/** Coarse countdown; the query refetches often enough to keep this roughly current. */
const resetsInText = (resetsAt: string): string => {
  const minutes = Math.max(0, Math.round((new Date(resetsAt).getTime() - Date.now()) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0
    ? i18n.translate('xpack.streams.significantEventsDiscovery.settings.runLimits.resetsInHours', {
        defaultMessage: 'Counters reset in {hours}h {minutes}m.',
        values: { hours, minutes: minutes % 60 },
      })
    : i18n.translate(
        'xpack.streams.significantEventsDiscovery.settings.runLimits.resetsInMinutes',
        {
          defaultMessage: 'Counters reset in {minutes}m.',
          values: { minutes },
        }
      );
};

const GroupRow = ({
  usage,
  draft,
  isDisabled,
  onChange,
}: {
  usage: RunBudgetGroupUsage;
  draft: RunLimit;
  isDisabled: boolean;
  onChange: (next: RunLimit) => void;
}) => {
  const { group, used } = usage;
  // Show progress against the saved limit, not the draft, so the bar keeps
  // describing what is actually being enforced while the user edits.
  const progress = usage.limit.enabled ? Math.min(used / Math.max(usage.limit.max, 1), 1) : 0;

  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="l">
      <EuiFlexItem grow={2}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText size="m">
              <h4>{GROUP_LABELS[group]}</h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {GROUP_DESCRIPTIONS[group]}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={5}>
        <EuiForm component="div">
          <EuiFormRow>
            <EuiSwitch
              data-test-subj={`streams-settings-run-limit-enabled-${group}`}
              label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.runLimits.enableLabel',
                { defaultMessage: 'Limit daily runs' }
              )}
              checked={draft.enabled}
              onChange={(event) => onChange({ ...draft, enabled: event.target.checked })}
              disabled={isDisabled}
            />
          </EuiFormRow>
          {draft.enabled && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.runLimits.maxLabel',
                { defaultMessage: 'Runs per day' }
              )}
            >
              <EuiFieldNumber
                data-test-subj={`streams-settings-run-limit-max-${group}`}
                value={draft.max}
                min={MIN_RUN_LIMIT}
                max={MAX_RUN_LIMIT}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  onChange({
                    ...draft,
                    max: Number.isFinite(parsed)
                      ? Math.min(Math.max(Math.round(parsed), MIN_RUN_LIMIT), MAX_RUN_LIMIT)
                      : MIN_RUN_LIMIT,
                  });
                }}
                disabled={isDisabled}
              />
            </EuiFormRow>
          )}
          <EuiFormRow>
            <div>
              <EuiText size="xs" data-test-subj={`streams-settings-run-limit-usage-${group}`}>
                {usageText({ used, limit: usage.limit })}
                {usage.exhausted &&
                  ` ${i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.runLimits.exhausted',
                    { defaultMessage: 'Automated runs are paused until the counter resets.' }
                  )}`}
              </EuiText>
              {usage.limit.enabled && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiProgress
                    size="s"
                    value={progress}
                    max={1}
                    color={usage.exhausted ? 'warning' : 'primary'}
                  />
                </>
              )}
            </div>
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function RunLimitsSection({ canManage }: { canManage: boolean }) {
  const { data, isLoading, isError, refetch } = useRunQuotas();
  const { save, isSaving } = useUpdateRunQuotas();

  const savedLimits = useMemo<Partial<Record<RunBudgetGroupId, RunLimit>>>(
    () =>
      Object.fromEntries((data?.groups ?? []).map(({ group, limit }) => [group, limit])) as Partial<
        Record<RunBudgetGroupId, RunLimit>
      >,
    [data]
  );

  const [draftLimits, setDraftLimits] = useState<Partial<Record<RunBudgetGroupId, RunLimit>>>({});

  // Reset the draft whenever the server state changes (initial load, refetch,
  // or a change made elsewhere), so the form never shows a stale edit target.
  useEffect(() => setDraftLimits(savedLimits), [savedLimits]);

  const changedGroups = useMemo(
    () =>
      (data?.groups ?? [])
        .map(({ group }) => group)
        .filter((group) => {
          const draft = draftLimits[group];
          const saved = savedLimits[group];
          return draft && saved && (draft.enabled !== saved.enabled || draft.max !== saved.max);
        }),
    [data, draftLimits, savedLimits]
  );

  const handleSave = useCallback(() => {
    void save({
      limits: Object.fromEntries(changedGroups.map((group) => [group, draftLimits[group]!])),
    });
  }, [changedGroups, draftLimits, save]);

  const isEditDisabled = !canManage || isSaving || isLoading || isError;

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>{SECTION_TITLE}</h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiText size="s">
          <p>{SECTION_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer />

        {isError && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              iconType="error"
              data-test-subj="streams-settings-run-limits-error"
              title={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.runLimits.errorTitle',
                { defaultMessage: 'Could not load daily run limits' }
              )}
            >
              <EuiButton
                size="s"
                onClick={() => refetch()}
                data-test-subj="streams-settings-run-limits-retry"
              >
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.runLimits.retry',
                  { defaultMessage: 'Retry' }
                )}
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {isLoading && <EuiLoadingSpinner size="m" />}

        {data && (
          <>
            {data.ledgerUnavailable && (
              <>
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  iconType="warning"
                  data-test-subj="streams-settings-run-limits-usage-unavailable"
                  title={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.runLimits.usageUnavailableTitle',
                    { defaultMessage: 'Usage counts are unavailable' }
                  )}
                >
                  <p>
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.runLimits.usageUnavailableBody',
                      {
                        defaultMessage:
                          'Today’s run counts could not be read, so every group is shown as unused. Limits are enforced by the same read, which means automation is not being blocked right now.',
                      }
                    )}
                  </p>
                </EuiCallOut>
                <EuiSpacer />
              </>
            )}

            {RUN_QUOTA_ENGINE_IDS.map((engine, engineIndex) => (
              <React.Fragment key={engine}>
                {engineIndex > 0 && <EuiHorizontalRule margin="l" />}
                <EuiText size="s">
                  <h4>{ENGINE_LABELS[engine]}</h4>
                </EuiText>
                <EuiSpacer size="m" />
                {RUN_BUDGET_GROUPS_BY_ENGINE[engine].map((group, groupIndex) => {
                  const usage = data.groups.find((candidate) => candidate.group === group);
                  const draft = draftLimits[group];
                  if (!usage || !draft) {
                    return null;
                  }
                  return (
                    <React.Fragment key={group}>
                      {groupIndex > 0 && <EuiSpacer size="l" />}
                      <GroupRow
                        usage={usage}
                        draft={draft}
                        isDisabled={isEditDisabled}
                        onChange={(next) => setDraftLimits((prev) => ({ ...prev, [group]: next }))}
                      />
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}

            <EuiSpacer />
            <EuiText size="xs" color="subdued" data-test-subj="streams-settings-run-limits-reset">
              {resetsInText(data.window.resetsAt)}{' '}
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.runLimits.timezone',
                {
                  defaultMessage: 'The daily window follows {timezone}.',
                  values: { timezone: data.window.timezone },
                }
              )}
            </EuiText>

            {changedGroups.length > 0 && (
              <>
                <EuiSpacer />
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      color="text"
                      isDisabled={isSaving}
                      onClick={() => setDraftLimits(savedLimits)}
                      data-test-subj="streams-settings-run-limits-cancel"
                    >
                      {i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.runLimits.cancel',
                        { defaultMessage: 'Cancel' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      fill
                      isLoading={isSaving}
                      isDisabled={isEditDisabled}
                      onClick={handleSave}
                      data-test-subj="streams-settings-run-limits-save"
                    >
                      {i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.runLimits.save',
                        { defaultMessage: 'Save run limits' }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>
        )}

        {!canManage && data && (
          <>
            <EuiSpacer />
            <EuiCallOut
              announceOnMount
              size="s"
              color="primary"
              iconType="lock"
              data-test-subj="streams-settings-run-limits-no-manage"
              title={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.runLimits.noManageTitle',
                { defaultMessage: 'Administrator access required' }
              )}
            >
              <p>
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.runLimits.noManageBody',
                  {
                    defaultMessage:
                      'You can view daily run limits and usage, but changing them requires the Streams manage privilege.',
                  }
                )}
              </p>
            </EuiCallOut>
          </>
        )}
      </EuiPanel>
    </EuiPanel>
  );
}
