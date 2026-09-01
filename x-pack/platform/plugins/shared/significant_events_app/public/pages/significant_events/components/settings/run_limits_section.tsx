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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CONTROLLED_RUN_BUDGET_GROUP_IDS,
  type ControlledRunBudgetGroupId,
  type RunBudgetGroupId,
  type RunBudgetGroupUsage,
  type RunLimit,
} from '@kbn/significant-events-plugin/common';
import {
  useRunQuotas,
  useRunQuotaStatus,
  useUpdateRunQuotaEnforcement,
  useUpdateRunQuotas,
} from '../../../../hooks/use_significant_events_run_quotas';
import { EnableRunLimitsModal } from './enable_run_limits_modal';
import {
  createRunLimitDraftState,
  editRunLimitDraft,
  mergeRunLimitRefresh,
  toDraft,
  toRunLimit,
  type RunLimitDraft,
  type RunLimitDraftState,
} from './run_limit_draft';
import { MemoryRunLimitRow, RunLimitRow } from './run_limit_row';
import { SkippedInvestigationsFlyout } from './skipped_investigations_flyout';

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
                return (
                  <React.Fragment key={group}>
                    {index > 0 && <EuiHorizontalRule margin="l" />}
                    <RunLimitRow
                      group={group}
                      usage={usage}
                      draft={draftState.drafts[group]}
                      disabled={!canManageLimits || isBusy}
                      groupLabel={RUN_BUDGET_GROUP_LABELS[group]}
                      groupWorkLabel={GROUP_WORK_LABELS[group]}
                      onChange={(draft) =>
                        setDraftState((current) =>
                          current ? editRunLimitDraft(current, group, draft) : current
                        )
                      }
                      onReview={() => setShowReview(true)}
                    />
                  </React.Fragment>
                );
              })}
              <EuiHorizontalRule margin="l" />
              {quotas.data.groups
                .filter(({ group }) => group === 'memory')
                .map((usage) => (
                  <MemoryRunLimitRow
                    key={usage.group}
                    usage={usage}
                    groupLabel={RUN_BUDGET_GROUP_LABELS.memory}
                  />
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
          groupLabels={RUN_BUDGET_GROUP_LABELS}
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
