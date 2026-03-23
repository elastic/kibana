/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import type { AgentHeartbeat, HeartbeatIntervalUnit } from '../../../../../../common/heartbeats';
import {
  HEARTBEAT_MAX_INTERVAL_MINUTES,
  toTotalMinutes,
} from '../../../../../../common/heartbeats';
import { useHeartbeats, useHeartbeatMutations } from '../../../../hooks/heartbeats/use_heartbeats';
import { useNavigation } from '../../../../hooks/use_navigation';
import { appPaths } from '../../../../utils/app_paths';

interface HeartbeatsTabProps {
  agentId: string;
}

interface HeartbeatFormValues {
  name: string;
  prompt: string;
  interval_value: number;
  interval_unit: HeartbeatIntervalUnit;
  /** ISO8601 timestamp, or undefined to fire immediately. */
  start_time?: string;
}

const INTERVAL_UNIT_OPTIONS: Array<{ value: HeartbeatIntervalUnit; text: string }> = [
  {
    value: 'minutes',
    text: i18n.translate('xpack.agentBuilder.heartbeats.intervalUnit.minutes', {
      defaultMessage: 'Minutes',
    }),
  },
  {
    value: 'hours',
    text: i18n.translate('xpack.agentBuilder.heartbeats.intervalUnit.hours', {
      defaultMessage: 'Hours',
    }),
  },
  {
    value: 'days',
    text: i18n.translate('xpack.agentBuilder.heartbeats.intervalUnit.days', {
      defaultMessage: 'Days',
    }),
  },
];

const DEFAULT_FORM_VALUES: HeartbeatFormValues = {
  name: '',
  prompt: '',
  interval_value: 15,
  interval_unit: 'minutes',
};

/**
 * The Heartbeats tab on the agent edit page.
 * Shows the list of heartbeats and lets users create, edit, pause/resume, and delete them.
 */
export const HeartbeatsTab: React.FC<HeartbeatsTabProps> = ({ agentId }) => {
  const { data: heartbeats = [], isLoading, error } = useHeartbeats(agentId);
  const mutations = useHeartbeatMutations(agentId);

  const [flyoutState, setFlyoutState] = useState<
    { mode: 'create' } | { mode: 'edit'; heartbeat: AgentHeartbeat } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentHeartbeat | null>(null);

  const openCreateFlyout = useCallback(() => setFlyoutState({ mode: 'create' }), []);
  const openEditFlyout = useCallback(
    (heartbeat: AgentHeartbeat) => setFlyoutState({ mode: 'edit', heartbeat }),
    []
  );
  const closeFlyout = useCallback(() => setFlyoutState(null), []);

  const handleFormSubmit = useCallback(
    async (values: HeartbeatFormValues) => {
      if (flyoutState?.mode === 'create') {
        await mutations.createHeartbeat.mutateAsync(values);
      } else if (flyoutState?.mode === 'edit') {
        await mutations.updateHeartbeat.mutateAsync({
          heartbeatId: flyoutState.heartbeat.id,
          body: values,
        });
      }
      closeFlyout();
    },
    [flyoutState, mutations, closeFlyout]
  );

  const handleTogglePause = useCallback(
    (heartbeat: AgentHeartbeat) => {
      if (heartbeat.status === 'active') {
        mutations.pauseHeartbeat.mutate(heartbeat.id);
      } else {
        mutations.resumeHeartbeat.mutate(heartbeat.id);
      }
    },
    [mutations]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) {
      await mutations.deleteHeartbeat.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, mutations]);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        css={css`
          padding: 32px 0;
        `}
      >
        <EuiLoadingSpinner size="l" />
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        color="danger"
        title={i18n.translate('xpack.agentBuilder.heartbeats.loadError', {
          defaultMessage: 'Failed to load heartbeats',
        })}
      />
    );
  }

  return (
    <>
      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {heartbeats.length === 0
              ? i18n.translate('xpack.agentBuilder.heartbeats.emptyDescription', {
                  defaultMessage:
                    'Heartbeats send a recurring prompt to this agent on a schedule. The agent runs autonomously and writes responses to its own dedicated conversation thread.',
                })
              : i18n.translate('xpack.agentBuilder.heartbeats.countDescription', {
                  defaultMessage:
                    '{count, plural, one {# heartbeat} other {# heartbeats}} configured.',
                  values: { count: heartbeats.length },
                })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plus"
            size="s"
            onClick={openCreateFlyout}
            data-test-subj="heartbeatAddButton"
          >
            {i18n.translate('xpack.agentBuilder.heartbeats.addButton', {
              defaultMessage: 'Add heartbeat',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {heartbeats.map((heartbeat) => (
        <HeartbeatCard
          key={heartbeat.id}
          agentId={agentId}
          heartbeat={heartbeat}
          onEdit={openEditFlyout}
          onTogglePause={handleTogglePause}
          onDelete={setDeleteTarget}
          isTogglingPause={
            (mutations.pauseHeartbeat.isLoading || mutations.resumeHeartbeat.isLoading) &&
            (mutations.pauseHeartbeat.variables === heartbeat.id ||
              mutations.resumeHeartbeat.variables === heartbeat.id)
          }
        />
      ))}

      {flyoutState && (
        <HeartbeatFormFlyout
          mode={flyoutState.mode}
          initialValues={
            flyoutState.mode === 'edit'
              ? {
                  name: flyoutState.heartbeat.name,
                  prompt: flyoutState.heartbeat.prompt,
                  interval_value: flyoutState.heartbeat.interval_value,
                  interval_unit: flyoutState.heartbeat.interval_unit,
                  start_time: flyoutState.heartbeat.start_time,
                }
              : DEFAULT_FORM_VALUES
          }
          isSubmitting={mutations.createHeartbeat.isLoading || mutations.updateHeartbeat.isLoading}
          submitError={
            ((mutations.createHeartbeat.error || mutations.updateHeartbeat.error) as Error)?.message
          }
          onSubmit={handleFormSubmit}
          onClose={closeFlyout}
        />
      )}

      {deleteTarget && (
        <EuiConfirmModal
          title={i18n.translate('xpack.agentBuilder.heartbeats.deleteConfirmTitle', {
            defaultMessage: 'Delete heartbeat "{name}"?',
            values: { name: deleteTarget.name },
          })}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          cancelButtonText={i18n.translate('xpack.agentBuilder.heartbeats.deleteCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.agentBuilder.heartbeats.deleteConfirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          isLoading={mutations.deleteHeartbeat.isLoading}
        >
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.heartbeats.deleteConfirmBody', {
              defaultMessage:
                'The heartbeat will stop firing. Its conversation thread will be preserved.',
            })}
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
};

// ── HeartbeatCard ─────────────────────────────────────────────────────────────

interface HeartbeatCardProps {
  agentId: string;
  heartbeat: AgentHeartbeat;
  onEdit: (heartbeat: AgentHeartbeat) => void;
  onTogglePause: (heartbeat: AgentHeartbeat) => void;
  onDelete: (heartbeat: AgentHeartbeat) => void;
  isTogglingPause: boolean;
}

const HeartbeatCard: React.FC<HeartbeatCardProps> = ({
  agentId,
  heartbeat,
  onEdit,
  onTogglePause,
  onDelete,
  isTogglingPause,
}) => {
  const { navigateToAgentBuilderUrl } = useNavigation();

  const intervalLabel = `${i18n.translate('xpack.agentBuilder.heartbeats.every', {
    defaultMessage: 'every',
  })} ${heartbeat.interval_value} ${heartbeat.interval_unit}`;

  const lastRunLabel = heartbeat.last_executed_at
    ? new Date(heartbeat.last_executed_at).toLocaleString()
    : i18n.translate('xpack.agentBuilder.heartbeats.neverRun', { defaultMessage: 'Never run' });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={css`
        margin-bottom: 12px;
      `}
      data-test-subj={`heartbeatCard-${heartbeat.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        {/* Status badge */}
        <EuiFlexItem grow={false}>
          <EuiBadge color={heartbeat.status === 'active' ? 'success' : 'default'}>
            {heartbeat.status === 'active'
              ? i18n.translate('xpack.agentBuilder.heartbeats.statusActive', {
                  defaultMessage: 'Active',
                })
              : i18n.translate('xpack.agentBuilder.heartbeats.statusPaused', {
                  defaultMessage: 'Paused',
                })}
          </EuiBadge>
        </EuiFlexItem>

        {/* Name + details */}
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{heartbeat.name}</strong>
                <span
                  css={css`
                    margin-left: 8px;
                    opacity: 0.7;
                  `}
                >
                  {intervalLabel}
                </span>
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {heartbeat.prompt.length > 80
                  ? `${heartbeat.prompt.slice(0, 80)}…`
                  : heartbeat.prompt}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.agentBuilder.heartbeats.lastRun', {
                      defaultMessage: 'Last run: {time}',
                      values: { time: lastRunLabel },
                    })}
                  </EuiText>
                </EuiFlexItem>

                {heartbeat.last_error && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={heartbeat.last_error} position="right">
                      <EuiBadge color="danger" iconType="warning">
                        {i18n.translate('xpack.agentBuilder.heartbeats.lastRunError', {
                          defaultMessage: 'Last run failed',
                        })}
                      </EuiBadge>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Actions */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {/* Open conversation thread */}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.agentBuilder.heartbeats.viewThread', {
                  defaultMessage: 'View conversation thread',
                })}
              >
                <EuiButtonIcon
                  iconType="discuss"
                  aria-label={i18n.translate('xpack.agentBuilder.heartbeats.viewThreadAriaLabel', {
                    defaultMessage: 'View conversation thread for {name}',
                    values: { name: heartbeat.name },
                  })}
                  onClick={() =>
                    navigateToAgentBuilderUrl(
                      appPaths.chat.conversation({ conversationId: heartbeat.conversation_id })
                    )
                  }
                  data-test-subj={`heartbeatViewThread-${heartbeat.id}`}
                />
              </EuiToolTip>
            </EuiFlexItem>

            {/* Edit */}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.agentBuilder.heartbeats.editTooltip', {
                  defaultMessage: 'Edit heartbeat',
                })}
              >
                <EuiButtonIcon
                  iconType="pencil"
                  aria-label={i18n.translate('xpack.agentBuilder.heartbeats.editAriaLabel', {
                    defaultMessage: 'Edit heartbeat {name}',
                    values: { name: heartbeat.name },
                  })}
                  onClick={() => onEdit(heartbeat)}
                  data-test-subj={`heartbeatEdit-${heartbeat.id}`}
                />
              </EuiToolTip>
            </EuiFlexItem>

            {/* Pause / Resume */}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  heartbeat.status === 'active'
                    ? i18n.translate('xpack.agentBuilder.heartbeats.pauseTooltip', {
                        defaultMessage: 'Pause heartbeat',
                      })
                    : i18n.translate('xpack.agentBuilder.heartbeats.resumeTooltip', {
                        defaultMessage: 'Resume heartbeat',
                      })
                }
              >
                <EuiButtonIcon
                  iconType={heartbeat.status === 'active' ? 'pause' : 'playFilled'}
                  aria-label={
                    heartbeat.status === 'active'
                      ? i18n.translate('xpack.agentBuilder.heartbeats.pauseAriaLabel', {
                          defaultMessage: 'Pause heartbeat {name}',
                          values: { name: heartbeat.name },
                        })
                      : i18n.translate('xpack.agentBuilder.heartbeats.resumeAriaLabel', {
                          defaultMessage: 'Resume heartbeat {name}',
                          values: { name: heartbeat.name },
                        })
                  }
                  isLoading={isTogglingPause}
                  onClick={() => onTogglePause(heartbeat)}
                  data-test-subj={`heartbeatTogglePause-${heartbeat.id}`}
                />
              </EuiToolTip>
            </EuiFlexItem>

            {/* Delete */}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.agentBuilder.heartbeats.deleteTooltip', {
                  defaultMessage: 'Delete heartbeat',
                })}
              >
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label={i18n.translate('xpack.agentBuilder.heartbeats.deleteAriaLabel', {
                    defaultMessage: 'Delete heartbeat {name}',
                    values: { name: heartbeat.name },
                  })}
                  onClick={() => onDelete(heartbeat)}
                  data-test-subj={`heartbeatDelete-${heartbeat.id}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// ── HeartbeatFormFlyout ───────────────────────────────────────────────────────

interface HeartbeatFormFlyoutProps {
  mode: 'create' | 'edit';
  initialValues: HeartbeatFormValues;
  isSubmitting: boolean;
  submitError?: string;
  onSubmit: (values: HeartbeatFormValues) => Promise<void>;
  onClose: () => void;
}

const HeartbeatFormFlyout: React.FC<HeartbeatFormFlyoutProps> = ({
  mode,
  initialValues,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}) => {
  const [values, setValues] = useState<HeartbeatFormValues>(initialValues);
  const [validationError, setValidationError] = useState<string | undefined>();

  const validate = (): boolean => {
    if (!values.name.trim()) {
      setValidationError(
        i18n.translate('xpack.agentBuilder.heartbeats.form.nameRequired', {
          defaultMessage: 'Name is required.',
        })
      );
      return false;
    }
    if (!values.prompt.trim()) {
      setValidationError(
        i18n.translate('xpack.agentBuilder.heartbeats.form.promptRequired', {
          defaultMessage: 'Prompt is required.',
        })
      );
      return false;
    }
    if (values.interval_value < 1) {
      setValidationError(
        i18n.translate('xpack.agentBuilder.heartbeats.form.intervalMin', {
          defaultMessage: 'Interval must be at least 1.',
        })
      );
      return false;
    }
    const totalMinutes = toTotalMinutes(values.interval_value, values.interval_unit);
    if (totalMinutes > HEARTBEAT_MAX_INTERVAL_MINUTES) {
      setValidationError(
        i18n.translate('xpack.agentBuilder.heartbeats.form.intervalMax', {
          defaultMessage: 'Interval must not exceed 30 days.',
        })
      );
      return false;
    }
    setValidationError(undefined);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(values);
  };

  const title =
    mode === 'create'
      ? i18n.translate('xpack.agentBuilder.heartbeats.form.createTitle', {
          defaultMessage: 'Add heartbeat',
        })
      : i18n.translate('xpack.agentBuilder.heartbeats.form.editTitle', {
          defaultMessage: 'Edit heartbeat',
        });

  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="heartbeatFormFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {(validationError || submitError) && (
          <>
            <EuiCallOut color="danger" title={validationError || submitError} iconType="error" />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.heartbeats.form.nameLabel', {
            defaultMessage: 'Name',
          })}
          helpText={i18n.translate('xpack.agentBuilder.heartbeats.form.nameHelp', {
            defaultMessage: 'A short label to identify this heartbeat.',
          })}
        >
          <EuiFieldText
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            data-test-subj="heartbeatFormName"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.heartbeats.form.promptLabel', {
            defaultMessage: 'Prompt',
          })}
          helpText={i18n.translate('xpack.agentBuilder.heartbeats.form.promptHelp', {
            defaultMessage: 'The message sent to the agent on each beat.',
          })}
        >
          <EuiTextArea
            value={values.prompt}
            onChange={(e) => setValues((v) => ({ ...v, prompt: e.target.value }))}
            rows={4}
            data-test-subj="heartbeatFormPrompt"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.heartbeats.form.intervalLabel', {
            defaultMessage: 'Interval',
          })}
          helpText={i18n.translate('xpack.agentBuilder.heartbeats.form.intervalHelp', {
            defaultMessage: 'How often the heartbeat fires. Minimum 1 minute, maximum 30 days.',
          })}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem
              grow={false}
              css={css`
                min-width: 80px;
              `}
            >
              <EuiFieldNumber
                value={values.interval_value}
                min={1}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    interval_value: parseInt(e.target.value, 10) || 1,
                  }))
                }
                data-test-subj="heartbeatFormIntervalValue"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSelect
                options={INTERVAL_UNIT_OPTIONS}
                value={values.interval_unit}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    interval_unit: e.target.value as HeartbeatIntervalUnit,
                  }))
                }
                data-test-subj="heartbeatFormIntervalUnit"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.heartbeats.form.startTimeLabel', {
            defaultMessage: 'Start time',
          })}
          helpText={i18n.translate('xpack.agentBuilder.heartbeats.form.startTimeHelp', {
            defaultMessage:
              'Optional. When the first beat should fire. Leave blank to start immediately.',
          })}
        >
          <EuiDatePicker
            selected={values.start_time ? moment(values.start_time) : undefined}
            onChange={(date) =>
              setValues((v) => ({ ...v, start_time: date?.toISOString() ?? undefined }))
            }
            showTimeSelect
            placeholderText={i18n.translate(
              'xpack.agentBuilder.heartbeats.form.startTimePlaceholder',
              { defaultMessage: 'Fire immediately' }
            )}
            data-test-subj="heartbeatFormStartTime"
          />
        </EuiFormRow>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="heartbeatFormCancel">
              {i18n.translate('xpack.agentBuilder.heartbeats.form.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSubmit}
              isLoading={isSubmitting}
              data-test-subj="heartbeatFormSubmit"
            >
              {mode === 'create'
                ? i18n.translate('xpack.agentBuilder.heartbeats.form.createButton', {
                    defaultMessage: 'Create heartbeat',
                  })
                : i18n.translate('xpack.agentBuilder.heartbeats.form.saveButton', {
                    defaultMessage: 'Save changes',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
