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
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CONTROLLED_RUN_BUDGET_GROUP_IDS,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  type ControlledRunBudgetGroupId,
  type RunBudgetGroupId,
  type RunBudgetGroupUsage,
  type RunLimit,
} from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useRunQuotaStatus,
  useSkippedRunQuotaInvestigations,
  useUpdateRunQuotaEnforcement,
  useUpdateRunQuotas,
} from '../../../../hooks/use_significant_events_run_quotas';
import { useSignificantEventsAppRouter } from '../../../../hooks/use_significant_events_app_router';
import {
  createRunLimitDraftState,
  editRunLimitDraft,
  mergeRunLimitRefresh,
  toDraft,
  toDraftFromInput,
  toRunLimit,
  type RunLimitDraft,
  type RunLimitDraftState,
} from './run_limit_draft';
import { CostEstimate } from './cost_estimate';

export const RUN_BUDGET_GROUP_LABELS: Record<RunBudgetGroupId, string> = {
  detection: i18n.translate('xpack.significantEventsApp.settings.runLimits.discoveryRowTitle', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.investigationRowTitle',
    { defaultMessage: 'Investigation' }
  ),
  ki_extraction: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.knowledgeIndicatorExtractionRowTitle',
    { defaultMessage: 'Knowledge indicator extraction' }
  ),
  memory: i18n.translate('xpack.significantEventsApp.settings.runLimits.memoryUpdatesRowTitle', {
    defaultMessage: 'Memory updates',
  }),
};

const GROUP_WORK_LABELS: Record<ControlledRunBudgetGroupId, string> = {
  detection: i18n.translate('xpack.significantEventsApp.settings.runLimits.discoveryWorkDetail', {
    defaultMessage: 'scheduled discovery work',
  }),
  investigation: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.investigationWorkDetail',
    { defaultMessage: 'scheduled investigation work' }
  ),
  ki_extraction: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.knowledgeIndicatorWorkDetail',
    { defaultMessage: 'scheduled knowledge indicator extraction work' }
  ),
};

const toControlledLimits = (
  groups: RunBudgetGroupUsage[]
): Record<ControlledRunBudgetGroupId, RunLimit> =>
  Object.fromEntries(
    CONTROLLED_RUN_BUDGET_GROUP_IDS.map((group) => [
      group,
      groups.find((candidate) => candidate.group === group)?.limit,
    ])
  ) as Record<ControlledRunBudgetGroupId, RunLimit>;

const formatResetTime = (resetsAt: string): string =>
  i18n.translate('xpack.significantEventsApp.settings.runLimits.resetTimeLabel', {
    defaultMessage: '{resetTime, date, medium} at {resetTime, time, short}',
    values: { resetTime: new Date(resetsAt) },
  });

const LimitInput = ({
  group,
  draft,
  disabled,
  onChange,
}: {
  group: ControlledRunBudgetGroupId;
  draft: RunLimitDraft;
  disabled: boolean;
  onChange: (draft: RunLimitDraft) => void;
}) => {
  const invalid = toRunLimit(draft) === undefined;
  return (
    <EuiFormRow
      label={i18n.translate('xpack.significantEventsApp.settings.runLimits.dailyLimitInputLabel', {
        defaultMessage: 'Daily limit',
      })}
      helpText={i18n.translate(
        'xpack.significantEventsApp.settings.runLimits.unlimitedInputDescription',
        {
          defaultMessage: 'Set 0 for unlimited.',
        }
      )}
      isInvalid={invalid}
      error={
        invalid
          ? i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.invalidLimitErrorMessage',
              {
                defaultMessage: 'Enter 0 or a whole number from {minimum} to {maximum}.',
                values: { minimum: MIN_RUN_LIMIT, maximum: MAX_RUN_LIMIT },
              }
            )
          : undefined
      }
    >
      <EuiFieldNumber
        data-test-subj={`significantEventsRunLimitInput-${group}`}
        value={draft.max}
        min={0}
        max={MAX_RUN_LIMIT}
        step={1}
        isInvalid={invalid}
        disabled={disabled}
        onChange={(event) => onChange(toDraftFromInput(event.target.value))}
      />
    </EuiFormRow>
  );
};

const UsageNumbers = ({ usage }: { usage: RunBudgetGroupUsage }) => (
  <>
    <EuiText size="s">
      <p data-test-subj={`significantEventsRunLimitUsage-${usage.group}`}>
        {i18n.translate('xpack.significantEventsApp.settings.runLimits.usageDescription', {
          defaultMessage:
            '{runs, plural, one {# run today} other {# runs today}} · {counted, plural, one {# counted} other {# counted}}',
          values: { runs: usage.used, counted: usage.counted },
        })}
      </p>
    </EuiText>
    {usage.group === 'investigation' && (
      <EuiText size="xs" color="subdued">
        <p data-test-subj="significantEventsRunLimitInvestigationSplit">
          {i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.investigationGrantSplitDescription',
            {
              defaultMessage:
                '{regular, plural, one {# regular grant} other {# regular grants}} · {critical, plural, one {# critical override} other {# critical overrides}}',
              values: {
                regular: usage.withinLimitGrantCount,
                critical: usage.criticalPastLimitGrantCount,
              },
            }
          )}
        </p>
      </EuiText>
    )}
  </>
);

const SkippedInvestigationsFlyout = ({ date, onClose }: { date: string; onClose: () => void }) => {
  const router = useSignificantEventsAppRouter();
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'runLimitReviewFlyoutTitle' });
  const { data, isLoading, isError } = useSkippedRunQuotaInvestigations({
    date,
    enabled: true,
  });

  return (
    <EuiFlyout
      onClose={onClose}
      ownFocus
      size="s"
      data-test-subj="runLimitReviewFlyout"
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={flyoutTitleId}>
          <h2>
            {i18n.translate('xpack.significantEventsApp.settings.runLimits.reviewFlyoutTitle', {
              defaultMessage: 'Investigation gate denials',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.reviewSpaceScopeDescription',
              {
                defaultMessage:
                  'The headline total is deployment-wide. The requests below are limited to the current space and are shown newest first.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        {isLoading && <EuiLoadingSpinner />}
        {isError && (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.reviewLoadErrorMessage',
              {
                defaultMessage: 'Could not load investigation gate denials',
              }
            )}
          />
        )}
        {data?.truncated && (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.reviewTruncatedDescription',
                {
                  defaultMessage: 'Showing the newest 200 rows.',
                }
              )}
            />
            <EuiSpacer />
          </>
        )}
        {data?.decisionsEvicted && (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.reviewEvictionDescription',
                {
                  defaultMessage:
                    'Older decisions have expired, so retries can appear more than once.',
                }
              )}
            />
            <EuiSpacer />
          </>
        )}
        {data?.rows.length === 0 && (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.reviewEmptyDescription',
                {
                  defaultMessage: 'No investigation gate denials are recorded for this space.',
                }
              )}
            </p>
          </EuiText>
        )}
        {data?.rows.map((row, index) => (
          <React.Fragment key={`${row.eventUuid}-${row.decidedAt}-${index}`}>
            {index > 0 && <EuiHorizontalRule margin="m" />}
            <EuiLink
              href={router.link('/{tab}', {
                path: { tab: 'significant_events' },
                query: { selectedEvent: row.eventId, openEvent: row.eventId },
              })}
            >
              {i18n.translate('xpack.significantEventsApp.settings.runLimits.reviewEventLinkText', {
                defaultMessage: 'Open event {eventId}',
                values: { eventId: row.eventId },
              })}
            </EuiLink>
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.significantEventsApp.settings.runLimits.reviewRowDescription',
                  {
                    defaultMessage:
                      'The gate denied the request at {decidedAt, date, medium}, {decidedAt, time, short}. Severity: {severity}.',
                    values: {
                      decidedAt: new Date(row.decidedAt),
                      severity: row.severity,
                    },
                  }
                )}
              </p>
            </EuiText>
          </React.Fragment>
        ))}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const EnableRunLimitsModal = ({
  groups,
  drafts,
  isSaving,
  onChange,
  onCancel,
  onConfirm,
}: {
  groups: RunBudgetGroupUsage[];
  drafts: Record<ControlledRunBudgetGroupId, RunLimitDraft>;
  isSaving: boolean;
  onChange: (group: ControlledRunBudgetGroupId, draft: RunLimitDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'enableRunLimitsModalTitle' });
  const valid = CONTROLLED_RUN_BUDGET_GROUP_IDS.every(
    (group) => toRunLimit(drafts[group]) !== undefined
  );

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.significantEventsApp.settings.runLimits.enableModalTitle', {
            defaultMessage: 'Enable daily run limits',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.enableModalDescription',
              {
                defaultMessage:
                  'Review today’s workflow runs and choose the deployment-wide limits. Existing ledger grants are retained, so re-enabling or restoring a cap on the same UTC day resumes its earlier count.',
              }
            )}
          </p>
        </EuiText>
        {CONTROLLED_RUN_BUDGET_GROUP_IDS.map((group, index) => {
          const usage = groups.find((candidate) => candidate.group === group);
          return (
            <React.Fragment key={group}>
              {index > 0 && <EuiHorizontalRule margin="m" />}
              <EuiTitle size="xs">
                <h3>{RUN_BUDGET_GROUP_LABELS[group]}</h3>
              </EuiTitle>
              {usage && <UsageNumbers usage={usage} />}
              <LimitInput
                group={group}
                draft={drafts[group]}
                disabled={isSaving}
                onChange={(draft) => onChange(group, draft)}
              />
            </React.Fragment>
          );
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} isDisabled={isSaving}>
          {i18n.translate('xpack.significantEventsApp.settings.runLimits.enableCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton fill onClick={onConfirm} isLoading={isSaving} isDisabled={!valid}>
          {i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.enableConfirmButtonLabel',
            {
              defaultMessage: 'Enable run limits',
            }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const RunLimitsSection = () => {
  const quotas = useRunQuotas();
  const status = useRunQuotaStatus();
  const { save, isSaving } = useUpdateRunQuotas();
  const { updateEnforcement, isUpdating } = useUpdateRunQuotaEnforcement();
  const [draftState, setDraftState] = useState<RunLimitDraftState>();
  const [enableDrafts, setEnableDrafts] =
    useState<Record<ControlledRunBudgetGroupId, RunLimitDraft>>();
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const [showLoweringConfirmation, setShowLoweringConfirmation] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const disableModalTitleId = useGeneratedHtmlId({ prefix: 'disableRunLimitsModalTitle' });
  const loweringModalTitleId = useGeneratedHtmlId({ prefix: 'lowerRunLimitsModalTitle' });

  const controlledLimits = useMemo(
    () => (quotas.data ? toControlledLimits(quotas.data.groups) : undefined),
    [quotas.data]
  );

  useEffect(() => {
    if (!controlledLimits) {
      return;
    }
    setDraftState((current) =>
      current
        ? mergeRunLimitRefresh(current, controlledLimits)
        : createRunLimitDraftState(controlledLimits)
    );
  }, [controlledLimits]);

  const dirtyPatch = useMemo(() => {
    if (!draftState) {
      return undefined;
    }
    const limits = Object.fromEntries(
      draftState.dirtyGroups.flatMap((group) => {
        const limit = toRunLimit(draftState.drafts[group]);
        return limit ? [[group, limit]] : [];
      })
    ) as Partial<Record<ControlledRunBudgetGroupId, RunLimit>>;
    return Object.keys(limits).length === draftState.dirtyGroups.length ? limits : undefined;
  }, [draftState]);

  const loweringGroups = useMemo(() => {
    if (!dirtyPatch || !quotas.data) {
      return [];
    }
    return CONTROLLED_RUN_BUDGET_GROUP_IDS.filter((group) => {
      const next = dirtyPatch[group];
      const usage = quotas.data?.groups.find((candidate) => candidate.group === group);
      return next?.enabled && usage !== undefined && next.max < usage.counted;
    });
  }, [dirtyPatch, quotas.data]);

  const performSave = useCallback(async () => {
    if (!dirtyPatch || !draftState) {
      return;
    }
    await save({ limits: dirtyPatch });
    setDraftState(
      createRunLimitDraftState({
        ...draftState.saved,
        ...dirtyPatch,
      })
    );
    setShowLoweringConfirmation(false);
  }, [dirtyPatch, draftState, save]);

  const handleSave = useCallback(() => {
    if (loweringGroups.length > 0) {
      setShowLoweringConfirmation(true);
      return;
    }
    void performSave();
  }, [loweringGroups.length, performSave]);

  const handleEnable = useCallback(async () => {
    if (!enableDrafts) {
      return;
    }
    const limits = Object.fromEntries(
      CONTROLLED_RUN_BUDGET_GROUP_IDS.flatMap((group) => {
        const limit = toRunLimit(enableDrafts[group]);
        return limit ? [[group, limit]] : [];
      })
    ) as Record<ControlledRunBudgetGroupId, RunLimit>;
    if (Object.keys(limits).length !== CONTROLLED_RUN_BUDGET_GROUP_IDS.length) {
      return;
    }
    await updateEnforcement({ enabled: true, limits });
    setEnableDrafts(undefined);
  }, [enableDrafts, updateEnforcement]);

  const isLoading = quotas.isLoading || status.isLoading;
  const isError = quotas.isError || status.isError;
  const canManageLimits = status.data?.canManageLimits === true;
  const enabled = status.data?.enabled === true;
  const isBusy = isSaving || isUpdating;

  return (
    <>
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>
                  {i18n.translate('xpack.significantEventsApp.settings.runLimits.sectionTitle', {
                    defaultMessage: 'Daily run limits',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            {!isLoading && !isError && canManageLimits && quotas.data && (
              <EuiFlexItem grow={false}>
                {enabled ? (
                  <EuiButtonEmpty
                    color="danger"
                    onClick={() => setShowDisableConfirmation(true)}
                    isDisabled={isBusy}
                    data-test-subj="significantEventsDisableRunLimitsButton"
                  >
                    {i18n.translate(
                      'xpack.significantEventsApp.settings.runLimits.disableButtonLabel',
                      {
                        defaultMessage: 'Disable run limits',
                      }
                    )}
                  </EuiButtonEmpty>
                ) : (
                  <EuiButton
                    fill
                    onClick={() =>
                      setEnableDrafts(
                        Object.fromEntries(
                          CONTROLLED_RUN_BUDGET_GROUP_IDS.map((group) => [
                            group,
                            toDraft(toControlledLimits(quotas.data.groups)[group]),
                          ])
                        ) as Record<ControlledRunBudgetGroupId, RunLimitDraft>
                      )
                    }
                    data-test-subj="significantEventsEnableRunLimitsButton"
                  >
                    {i18n.translate(
                      'xpack.significantEventsApp.settings.runLimits.enableButtonLabel',
                      {
                        defaultMessage: 'Enable run limits',
                      }
                    )}
                  </EuiButton>
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
        <EuiPanel hasShadow={false}>
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.significantEventsApp.settings.runLimits.sectionDescription', {
                defaultMessage:
                  'Daily run limits apply to Significant Events scheduled automation across the deployment and every space. Run limits do not apply to manual runs.',
              })}
            </p>
          </EuiText>
          {!status.isLoading && !status.isError && (
            <>
              <EuiSpacer />
              <CostEstimate canManage={canManageLimits} groupLabels={RUN_BUDGET_GROUP_LABELS} />
              <EuiSpacer />
            </>
          )}
          {isLoading && <EuiLoadingSpinner size="m" />}
          {isError && (
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.loadErrorMessage',
                {
                  defaultMessage: 'Could not load daily run limits',
                }
              )}
            >
              <EuiButton
                size="s"
                onClick={() => {
                  void Promise.all([quotas.refetch(), status.refetch()]);
                }}
              >
                {i18n.translate('xpack.significantEventsApp.settings.runLimits.retryButtonLabel', {
                  defaultMessage: 'Retry',
                })}
              </EuiButton>
            </EuiCallOut>
          )}
          {!isLoading && !isError && !enabled && (
            <>
              <EuiText size="s" color="subdued">
                <p data-test-subj="significantEventsRunLimitsDisabledDescription">
                  {i18n.translate(
                    'xpack.significantEventsApp.settings.runLimits.disabledDescription',
                    {
                      defaultMessage:
                        'Run limits are off. Scheduled automation is not being charged against the daily grant ledger.',
                    }
                  )}
                </p>
              </EuiText>
              {!canManageLimits && (
                <>
                  <EuiSpacer />
                  <EuiCallOut
                    announceOnMount
                    color="primary"
                    iconType="lock"
                    title={i18n.translate(
                      'xpack.significantEventsApp.settings.runLimits.disabledReadOnlyTitle',
                      {
                        defaultMessage: 'Deployment-wide privilege required',
                      }
                    )}
                  >
                    <p>
                      {i18n.translate(
                        'xpack.significantEventsApp.settings.runLimits.disabledReadOnlyDescription',
                        {
                          defaultMessage:
                            'Enabling run limits requires the Streams manage privilege in every space.',
                        }
                      )}
                    </p>
                  </EuiCallOut>
                </>
              )}
            </>
          )}
          {!isLoading && !isError && enabled && quotas.data && draftState && (
            <>
              <EuiSpacer />
              {CONTROLLED_RUN_BUDGET_GROUP_IDS.map((group, index) => {
                const usage = quotas.data.groups.find((candidate) => candidate.group === group);
                if (!usage) {
                  return null;
                }
                const reached = usage.limit.enabled && usage.counted >= usage.limit.max;
                const hasEarlierInvestigationDenials =
                  group === 'investigation' && usage.totalSkipped > 0 && !reached;
                return (
                  <React.Fragment key={group}>
                    {index > 0 && <EuiHorizontalRule margin="l" />}
                    <EuiFlexGroup alignItems="flexStart">
                      <EuiFlexItem>
                        <EuiTitle size="xs">
                          <h4>{RUN_BUDGET_GROUP_LABELS[group]}</h4>
                        </EuiTitle>
                        <UsageNumbers usage={usage} />
                        {status.data?.driverHealth[group].status === 'degraded' && (
                          <EuiText size="xs" color="warning">
                            <p>
                              {group === 'detection' &&
                              status.data.driverHealth[group].staleSpaceCount
                                ? i18n.translate(
                                    'xpack.significantEventsApp.settings.runLimits.staleDetectionDriverDescription',
                                    {
                                      defaultMessage:
                                        'The scheduled driver is stale in {count, plural, one {# space} other {# spaces}}. Gate failures fail open, so this health check does not prove that every request was counted.',
                                      values: {
                                        count: status.data.driverHealth[group].staleSpaceCount,
                                      },
                                    }
                                  )
                                : i18n.translate(
                                    'xpack.significantEventsApp.settings.runLimits.staleDriverDescription',
                                    {
                                      defaultMessage:
                                        'The scheduled driver has not reported recently. Gate failures fail open, so some work can continue uncounted.',
                                    }
                                  )}
                            </p>
                          </EuiText>
                        )}
                        {status.data?.driverHealth[group].status === 'unknown' && (
                          <EuiText size="xs" color="subdued">
                            <p>
                              {i18n.translate(
                                'xpack.significantEventsApp.settings.runLimits.unknownDriverHealthDescription',
                                {
                                  defaultMessage:
                                    'Scheduled-driver reachability is not known yet. A healthy heartbeat confirms only that the driver reached its heartbeat route.',
                                }
                              )}
                            </p>
                          </EuiText>
                        )}
                        {reached && (
                          <EuiText size="xs" color="warning">
                            <p>
                              {group === 'investigation'
                                ? i18n.translate(
                                    'xpack.significantEventsApp.settings.runLimits.investigationReachedDescription',
                                    {
                                      defaultMessage:
                                        'Limit reached: {count, plural, one {# gate denial} other {# gate denials}} today.',
                                      values: { count: usage.totalSkipped },
                                    }
                                  )
                                : i18n.translate(
                                    'xpack.significantEventsApp.settings.runLimits.workerReachedDescription',
                                    {
                                      defaultMessage:
                                        'Limit reached. New {work} is denied until the counter resets.',
                                      values: { work: GROUP_WORK_LABELS[group] },
                                    }
                                  )}{' '}
                              {group === 'investigation' && (
                                <EuiLink onClick={() => setShowReview(true)}>
                                  {i18n.translate(
                                    'xpack.significantEventsApp.settings.runLimits.reviewLinkText',
                                    {
                                      defaultMessage: 'Review',
                                    }
                                  )}
                                </EuiLink>
                              )}
                            </p>
                          </EuiText>
                        )}
                        {hasEarlierInvestigationDenials && (
                          <EuiText size="xs" color="subdued">
                            <p>
                              {i18n.translate(
                                'xpack.significantEventsApp.settings.runLimits.earlierInvestigationDenialsDescription',
                                {
                                  defaultMessage:
                                    'Earlier today, the gate denied {count, plural, one {# investigation request} other {# investigation requests}}.',
                                  values: { count: usage.totalSkipped },
                                }
                              )}{' '}
                              <EuiLink onClick={() => setShowReview(true)}>
                                {i18n.translate(
                                  'xpack.significantEventsApp.settings.runLimits.reviewLinkText',
                                  {
                                    defaultMessage: 'Review',
                                  }
                                )}
                              </EuiLink>
                            </p>
                          </EuiText>
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <LimitInput
                          group={group}
                          draft={draftState.drafts[group]}
                          disabled={!canManageLimits || isBusy}
                          onChange={(draft) =>
                            setDraftState((current) =>
                              current ? editRunLimitDraft(current, group, draft) : current
                            )
                          }
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </React.Fragment>
                );
              })}
              <EuiHorizontalRule margin="l" />
              {quotas.data.groups
                .filter(({ group }) => group === 'memory')
                .map((usage) => (
                  <div key={usage.group}>
                    <EuiTitle size="xs">
                      <h4>{RUN_BUDGET_GROUP_LABELS.memory}</h4>
                    </EuiTitle>
                    <EuiText size="s">
                      <p>
                        {i18n.translate(
                          'xpack.significantEventsApp.settings.runLimits.memoryUsageDescription',
                          {
                            defaultMessage:
                              '{runs, plural, one {# run today} other {# runs today}}',
                            values: { runs: usage.used },
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      <p>
                        {i18n.translate(
                          'xpack.significantEventsApp.settings.runLimits.memoryUncappedDescription',
                          {
                            defaultMessage:
                              'No limit: memory automation is not capped because the same workflows power scheduled and manual updates.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </div>
                ))}
              <EuiSpacer />
              <EuiText size="xs" color="subdued">
                <p data-test-subj="significantEventsRunLimitsResetTime">
                  {i18n.translate(
                    'xpack.significantEventsApp.settings.runLimits.counterResetDescription',
                    {
                      defaultMessage: 'Counters reset at {resetTime}.',
                      values: { resetTime: formatResetTime(quotas.data.window.resetsAt) },
                    }
                  )}
                </p>
              </EuiText>
              {draftState.conflictingGroups.length > 0 && (
                <>
                  <EuiSpacer />
                  <EuiCallOut
                    announceOnMount
                    color="warning"
                    iconType="warning"
                    title={i18n.translate(
                      'xpack.significantEventsApp.settings.runLimits.editConflictDescription',
                      {
                        defaultMessage:
                          'A limit you are editing changed on the server. Cancel your edits to load the latest values before saving.',
                      }
                    )}
                  />
                </>
              )}
              {!canManageLimits && (
                <>
                  <EuiSpacer />
                  <EuiCallOut
                    announceOnMount
                    color="primary"
                    iconType="lock"
                    title={i18n.translate(
                      'xpack.significantEventsApp.settings.runLimits.readOnlyTitle',
                      {
                        defaultMessage: 'Deployment-wide privilege required',
                      }
                    )}
                  >
                    <p>
                      {i18n.translate(
                        'xpack.significantEventsApp.settings.runLimits.readOnlyDescription',
                        {
                          defaultMessage:
                            'You can view run limits, but changing them requires the Streams manage privilege in every space.',
                        }
                      )}
                    </p>
                  </EuiCallOut>
                </>
              )}
              {draftState.dirtyGroups.length > 0 && (
                <>
                  <EuiSpacer />
                  <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        onClick={() =>
                          controlledLimits &&
                          setDraftState(createRunLimitDraftState(controlledLimits))
                        }
                        isDisabled={isBusy}
                      >
                        {i18n.translate(
                          'xpack.significantEventsApp.settings.runLimits.cancelButtonLabel',
                          {
                            defaultMessage: 'Cancel',
                          }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        fill
                        onClick={handleSave}
                        isLoading={isSaving}
                        isDisabled={
                          !canManageLimits || !dirtyPatch || draftState.conflictingGroups.length > 0
                        }
                        data-test-subj="significantEventsSaveRunLimitsButton"
                      >
                        {i18n.translate(
                          'xpack.significantEventsApp.settings.runLimits.saveButtonLabel',
                          {
                            defaultMessage: 'Save run limits',
                          }
                        )}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
            </>
          )}
        </EuiPanel>
      </EuiPanel>

      {enableDrafts && quotas.data && (
        <EnableRunLimitsModal
          groups={quotas.data.groups}
          drafts={enableDrafts}
          isSaving={isUpdating}
          onChange={(group, draft) =>
            setEnableDrafts((current) => (current ? { ...current, [group]: draft } : current))
          }
          onCancel={() => setEnableDrafts(undefined)}
          onConfirm={() => void handleEnable()}
        />
      )}

      {showDisableConfirmation && (
        <EuiConfirmModal
          aria-labelledby={disableModalTitleId}
          titleProps={{ id: disableModalTitleId }}
          title={i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.disableConfirmTitle',
            {
              defaultMessage: 'Disable daily run limits?',
            }
          )}
          onCancel={() => setShowDisableConfirmation(false)}
          onConfirm={() => {
            void updateEnforcement({ enabled: false }).then(() =>
              setShowDisableConfirmation(false)
            );
          }}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.disableCancelButtonLabel',
            {
              defaultMessage: 'Keep limits enabled',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.disableConfirmButtonLabel',
            {
              defaultMessage: 'Disable run limits',
            }
          )}
          buttonColor="danger"
        >
          <p>
            {i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.disableConfirmDescription',
              {
                defaultMessage:
                  'New gate requests will stop using the limits. A gate request that already read the previous setting can still finish later, and work fails open if a gate is unavailable. The daily ledger is retained.',
              }
            )}
          </p>
        </EuiConfirmModal>
      )}

      {showLoweringConfirmation && quotas.data && dirtyPatch && (
        <EuiConfirmModal
          aria-labelledby={loweringModalTitleId}
          titleProps={{ id: loweringModalTitleId }}
          title={i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.loweringConfirmTitle',
            {
              defaultMessage: 'Lower limits below today’s usage?',
            }
          )}
          onCancel={() => setShowLoweringConfirmation(false)}
          onConfirm={() => void performSave()}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.loweringCancelButtonLabel',
            {
              defaultMessage: 'Keep editing',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.loweringConfirmButtonLabel',
            {
              defaultMessage: 'Save lower limits',
            }
          )}
          buttonColor="warning"
        >
          {loweringGroups.map((group) => {
            const usage = quotas.data?.groups.find((candidate) => candidate.group === group);
            const limit = dirtyPatch[group];
            return usage && limit?.enabled ? (
              <p key={group}>
                {i18n.translate(
                  'xpack.significantEventsApp.settings.runLimits.loweringGroupWarningDescription',
                  {
                    defaultMessage:
                      '{group} has counted {counted} runs today. A limit of {limit} denies new {work} until the counter resets ({resetTime}).',
                    values: {
                      group: RUN_BUDGET_GROUP_LABELS[group],
                      counted: usage.counted,
                      limit: limit.max,
                      work: GROUP_WORK_LABELS[group],
                      resetTime: formatResetTime(quotas.data.window.resetsAt),
                    },
                  }
                )}
              </p>
            ) : null;
          })}
          <p>
            {i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.loweringCommonWarningDescription',
              {
                defaultMessage:
                  'Work already admitted will finish, and a gate request that already read the previous limit can finish later. If a gate is unavailable, work fails open and can continue uncounted. Run limits do not apply to manual runs.',
              }
            )}
          </p>
        </EuiConfirmModal>
      )}

      {showReview && quotas.data && (
        <SkippedInvestigationsFlyout
          date={quotas.data.window.start.slice(0, 10)}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  );
};
