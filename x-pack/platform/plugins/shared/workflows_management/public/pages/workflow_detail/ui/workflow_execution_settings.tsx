/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  executionSettingsPatch,
  invalidExecutionSettings,
  readExecutionSettings,
} from './workflow_execution_settings_model';
import type {
  ExecutionSettingsDraft,
  ExecutionSettingsField,
  ExecutionSettingsPatch,
} from './workflow_execution_settings_model';

export interface WorkflowExecutionSettingsProps {
  /** The `settings` of the workflow, read once when the form opens. */
  readonly settings: unknown;
  /** Called with what to write, as a field is left or the strategy changes. */
  readonly onCommit: (patch: ExecutionSettingsPatch) => void;
  readonly readOnly?: boolean;
}

const DURATION_HELP = i18n.translate('workflows.workflowSettingsFlyout.execution.durationInvalid', {
  defaultMessage: 'Enter a duration such as 30s, 5m or 1h.',
});

const STRATEGY_OPTIONS = [
  {
    value: '',
    text: i18n.translate('workflows.workflowSettingsFlyout.execution.strategyNotSet', {
      defaultMessage: 'Not set',
    }),
  },
  {
    value: 'drop',
    text: i18n.translate('workflows.workflowSettingsFlyout.execution.strategyDrop', {
      defaultMessage: 'Drop the new run',
    }),
  },
  {
    value: 'cancel-in-progress',
    text: i18n.translate('workflows.workflowSettingsFlyout.execution.strategyCancel', {
      defaultMessage: 'Cancel the run in progress',
    }),
  },
  {
    value: 'queue',
    text: i18n.translate('workflows.workflowSettingsFlyout.execution.strategyQueue', {
      defaultMessage: 'Queue the new run',
    }),
  },
] as const;

/** Timeout, maximum step size and concurrency limits of a workflow, edited from the General tab. */
export const WorkflowExecutionSettings = ({
  settings,
  onCommit,
  readOnly = false,
}: WorkflowExecutionSettingsProps) => {
  const [draft, setDraft] = useState<ExecutionSettingsDraft>(() => readExecutionSettings(settings));
  const [touched, setTouched] = useState<ReadonlySet<ExecutionSettingsField>>(new Set());
  const invalid = invalidExecutionSettings(draft);

  const update = useCallback((patch: Partial<ExecutionSettingsDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const leave = useCallback(
    (field: ExecutionSettingsField) => {
      setTouched((current) => new Set(current).add(field));
      if (!readOnly) onCommit(executionSettingsPatch(draft));
    },
    [draft, onCommit, readOnly]
  );

  const errorOf = (field: ExecutionSettingsField, message: string): string | undefined =>
    touched.has(field) && invalid.has(field) ? message : undefined;

  const timeoutError = errorOf('timeout', DURATION_HELP);
  const maxStepSizeError = errorOf(
    'maxStepSize',
    i18n.translate('workflows.workflowSettingsFlyout.execution.maxStepSizeInvalid', {
      defaultMessage: 'Enter a size such as 10mb or 1gb.',
    })
  );
  const keyError = errorOf(
    'concurrencyKey',
    i18n.translate('workflows.workflowSettingsFlyout.execution.keyInvalid', {
      defaultMessage: 'The key can be at most 512 characters.',
    })
  );
  const wholeNumber = i18n.translate('workflows.workflowSettingsFlyout.execution.numberInvalid', {
    defaultMessage: 'Enter a whole number of 1 or more.',
  });
  const maxError = errorOf('concurrencyMax', wholeNumber);
  const queueSizeError = errorOf('queueSize', wholeNumber);
  const queueTtlError = errorOf('queueTtl', DURATION_HELP);

  return (
    <div data-test-subj="workflowSettingsExecution">
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('workflows.workflowSettingsFlyout.execution.title', {
            defaultMessage: 'Execution',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow
        fullWidth
        label={i18n.translate('workflows.workflowSettingsFlyout.execution.timeoutLabel', {
          defaultMessage: 'Timeout',
        })}
        helpText={i18n.translate('workflows.workflowSettingsFlyout.execution.timeoutHelp', {
          defaultMessage:
            'How long a run may take before it is stopped, for example 30s, 5m or 1h.',
        })}
        isInvalid={timeoutError !== undefined}
        error={timeoutError}
      >
        <EuiFieldText
          fullWidth
          compressed
          value={draft.timeout}
          onChange={(event) => update({ timeout: event.target.value })}
          onBlur={() => leave('timeout')}
          disabled={readOnly}
          isInvalid={timeoutError !== undefined}
          data-test-subj="workflowSettingsTimeoutInput"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        label={i18n.translate('workflows.workflowSettingsFlyout.execution.maxStepSizeLabel', {
          defaultMessage: 'Maximum step size',
        })}
        helpText={i18n.translate('workflows.workflowSettingsFlyout.execution.maxStepSizeHelp', {
          defaultMessage: 'The most data one step may produce, for example 10mb or 1gb.',
        })}
        isInvalid={maxStepSizeError !== undefined}
        error={maxStepSizeError}
      >
        <EuiFieldText
          fullWidth
          compressed
          value={draft.maxStepSize}
          onChange={(event) => update({ maxStepSize: event.target.value })}
          onBlur={() => leave('maxStepSize')}
          disabled={readOnly}
          isInvalid={maxStepSizeError !== undefined}
          data-test-subj="workflowSettingsMaxStepSizeInput"
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('workflows.workflowSettingsFlyout.execution.concurrencyTitle', {
            defaultMessage: 'Concurrency',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow
        fullWidth
        label={i18n.translate('workflows.workflowSettingsFlyout.execution.keyLabel', {
          defaultMessage: 'Group key',
        })}
        helpText={i18n.translate('workflows.workflowSettingsFlyout.execution.keyHelp', {
          defaultMessage:
            'Runs that render the same key share one limit. Accepts a template, for example {template}.',
          values: { template: '{{ event.host.name }}' },
        })}
        isInvalid={keyError !== undefined}
        error={keyError}
      >
        <EuiFieldText
          fullWidth
          compressed
          value={draft.concurrencyKey}
          onChange={(event) => update({ concurrencyKey: event.target.value })}
          onBlur={() => leave('concurrencyKey')}
          disabled={readOnly}
          isInvalid={keyError !== undefined}
          data-test-subj="workflowSettingsConcurrencyKeyInput"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        label={i18n.translate('workflows.workflowSettingsFlyout.execution.maxLabel', {
          defaultMessage: 'Maximum concurrent runs',
        })}
        isInvalid={maxError !== undefined}
        error={maxError}
      >
        <EuiFieldNumber
          fullWidth
          compressed
          min={1}
          step={1}
          value={draft.concurrencyMax}
          onChange={(event) => update({ concurrencyMax: event.target.value })}
          onBlur={() => leave('concurrencyMax')}
          disabled={readOnly}
          isInvalid={maxError !== undefined}
          data-test-subj="workflowSettingsConcurrencyMaxInput"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        label={i18n.translate('workflows.workflowSettingsFlyout.execution.strategyLabel', {
          defaultMessage: 'When the limit is reached',
        })}
      >
        <EuiSelect
          fullWidth
          compressed
          options={STRATEGY_OPTIONS.map((option) => ({ ...option }))}
          value={draft.concurrencyStrategy}
          onChange={(event) => {
            const next = {
              ...draft,
              concurrencyStrategy: event.target
                .value as ExecutionSettingsDraft['concurrencyStrategy'],
            };
            setDraft(next);
            if (!readOnly) onCommit(executionSettingsPatch(next));
          }}
          disabled={readOnly}
          data-test-subj="workflowSettingsConcurrencyStrategySelect"
        />
      </EuiFormRow>

      {draft.concurrencyStrategy === 'queue' ? (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('workflows.workflowSettingsFlyout.execution.queueSizeLabel', {
              defaultMessage: 'Queue size',
            })}
            helpText={i18n.translate('workflows.workflowSettingsFlyout.execution.queueSizeHelp', {
              defaultMessage: 'Runs waiting beyond this number are skipped. The default is 100.',
            })}
            isInvalid={queueSizeError !== undefined}
            error={queueSizeError}
          >
            <EuiFieldNumber
              fullWidth
              compressed
              min={1}
              step={1}
              value={draft.queueSize}
              onChange={(event) => update({ queueSize: event.target.value })}
              onBlur={() => leave('queueSize')}
              disabled={readOnly}
              isInvalid={queueSizeError !== undefined}
              data-test-subj="workflowSettingsQueueSizeInput"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('workflows.workflowSettingsFlyout.execution.queueTtlLabel', {
              defaultMessage: 'Queue time limit',
            })}
            helpText={i18n.translate('workflows.workflowSettingsFlyout.execution.queueTtlHelp', {
              defaultMessage: 'A run queued for longer than this is skipped. The default is 24h.',
            })}
            isInvalid={queueTtlError !== undefined}
            error={queueTtlError}
          >
            <EuiFieldText
              fullWidth
              compressed
              value={draft.queueTtl}
              onChange={(event) => update({ queueTtl: event.target.value })}
              onBlur={() => leave('queueTtl')}
              disabled={readOnly}
              isInvalid={queueTtlError !== undefined}
              data-test-subj="workflowSettingsQueueTtlInput"
            />
          </EuiFormRow>
        </>
      ) : null}
    </div>
  );
};
