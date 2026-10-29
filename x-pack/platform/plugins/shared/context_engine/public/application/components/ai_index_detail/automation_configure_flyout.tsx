/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSkeletonText,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQueryClient } from '@kbn/react-query';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import React, { useEffect, useMemo, useState } from 'react';
import { useAiConnectors } from '../../hooks/use_ai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflow } from '../../hooks/use_workflow';
import { getErrorMessage } from '../../utils/get_error_message';
import {
  SCHEDULE_PATTERN,
  applyWorkflowParameters,
  readWorkflowParameters,
  type WorkflowParameter,
} from '../../utils/workflow_parameters';

const TITLE_ID = 'contextAutomationConfigureFlyoutTitle';

/** Consts the template sets at install that identify the automation; changing them breaks it. */
const INSTALL_TIME_CONSTS = new Set(['ai_index_id', 'automation_name']);
/** The const holding the AI connector an `ai.prompt` step runs on. */
const CONNECTOR_CONST = 'connector_id';
const DEFAULT_CONNECTOR_OPTION = '';

interface AutomationConfigureFlyoutProps {
  workflowId: string;
  workflowName: string;
  editHref: string;
  onClose: () => void;
}

/** Edited as text; parsed back to the parameter's type on save. */
const toDraft = ({ kind, value }: WorkflowParameter): string | boolean => {
  if (kind === 'boolean') {
    return value === true;
  }
  if (kind === 'json') {
    return JSON.stringify(value, null, 2);
  }
  return value === null || value === undefined ? '' : String(value);
};

const parseDraft = (
  parameter: WorkflowParameter,
  draft: string | boolean
): { value: unknown } | { error: string } => {
  if (parameter.kind === 'boolean') {
    return { value: draft === true };
  }
  const text = String(draft);
  if (parameter.kind === 'number') {
    const value = Number(text);
    return text.trim() !== '' && Number.isFinite(value)
      ? { value }
      : {
          error: i18n.translate('xpack.contextEngine.automationConfigure.numberError', {
            defaultMessage: 'Enter a number.',
          }),
        };
  }
  if (parameter.kind === 'json') {
    try {
      return { value: JSON.parse(text) };
    } catch {
      return {
        error: i18n.translate('xpack.contextEngine.automationConfigure.jsonError', {
          defaultMessage: 'Enter valid JSON.',
        }),
      };
    }
  }
  return { value: text };
};

/** Edits the parameters (`consts`) and schedule of an automation's workflow in place. */
export const AutomationConfigureFlyout = ({
  workflowId,
  workflowName,
  editHref,
  onClose,
}: AutomationConfigureFlyoutProps) => {
  const {
    services: { notifications },
  } = useKibana();
  const api = useWorkflowsApi();
  const queryClient = useQueryClient();
  const { data: workflow, isLoading, error } = useWorkflow(workflowId);
  const connectors = useAiConnectors();

  const parsed = useMemo(
    () => (workflow?.yaml ? readWorkflowParameters(workflow.yaml) : undefined),
    [workflow?.yaml]
  );
  const [drafts, setDrafts] = useState<Record<string, string | boolean>>({});
  const [schedule, setSchedule] = useState<string>();
  const [saveError, setSaveError] = useState<string[]>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!parsed) {
      return;
    }
    setDrafts(Object.fromEntries(parsed.parameters.map((entry) => [entry.key, toDraft(entry)])));
    setSchedule(parsed.schedule);
  }, [parsed]);

  const results = useMemo(
    () =>
      new Map(
        (parsed?.parameters ?? []).map((entry) => [
          entry.key,
          parseDraft(entry, drafts[entry.key] ?? toDraft(entry)),
        ])
      ),
    [drafts, parsed]
  );
  const scheduleInvalid = schedule !== undefined && !SCHEDULE_PATTERN.test(schedule);
  const hasErrors = scheduleInvalid || [...results.values()].some((result) => 'error' in result);

  const save = async () => {
    if (!workflow?.yaml || !parsed || hasErrors) {
      return;
    }
    const values = Object.fromEntries(
      parsed.parameters.flatMap((entry) => {
        const result = results.get(entry.key);
        return result && 'value' in result && !INSTALL_TIME_CONSTS.has(entry.key)
          ? [[entry.key, result.value]]
          : [];
      })
    );
    setIsSaving(true);
    setSaveError(undefined);
    try {
      const response = await api.updateWorkflow(workflowId, {
        name: workflow.name,
        ...(workflow.description !== undefined && { description: workflow.description }),
        enabled: workflow.enabled,
        tags: workflow.tags ?? [],
        yaml: applyWorkflowParameters(workflow.yaml, {
          values,
          ...(schedule !== undefined && { schedule }),
        }),
      });
      if (!response.valid) {
        setSaveError(response.validationErrors);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['context_engine', 'workflow', workflowId] });
      await queryClient.invalidateQueries({ queryKey: ['context_engine', 'workflow_summaries'] });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.contextEngine.automationConfigure.saved', {
          defaultMessage: 'Saved {name}',
          values: { name: workflowName },
        })
      );
      onClose();
    } catch (saveFailure) {
      setSaveError([getErrorMessage(saveFailure) ?? String(saveFailure)]);
    } finally {
      setIsSaving(false);
    }
  };

  const setDraft = (key: string, value: string | boolean) =>
    setDrafts((current) => ({ ...current, [key]: value }));

  const renderField = (entry: WorkflowParameter) => {
    const draft = drafts[entry.key] ?? toDraft(entry);
    const result = results.get(entry.key);
    const errorText = result && 'error' in result ? result.error : undefined;
    const disabled = INSTALL_TIME_CONSTS.has(entry.key);
    const helpText = disabled
      ? i18n.translate('xpack.contextEngine.automationConfigure.installTime', {
          defaultMessage: '{description} Set when the automation was installed.',
          values: { description: entry.description ?? '' },
        })
      : entry.description;
    const label = entry.key.replace(/_/g, ' ');

    let control: React.ReactElement;
    if (entry.key === CONNECTOR_CONST && entry.kind === 'string' && !connectors.isError) {
      const known = connectors.data ?? [];
      const current = String(draft);
      control = (
        <EuiSuperSelect
          fullWidth
          aria-label={label}
          isLoading={connectors.isLoading}
          valueOfSelected={current}
          onChange={(value) => setDraft(entry.key, value)}
          options={[
            {
              value: DEFAULT_CONNECTOR_OPTION,
              inputDisplay: i18n.translate(
                'xpack.contextEngine.automationConfigure.defaultConnector',
                { defaultMessage: 'Context Engine model (default)' }
              ),
            },
            ...known.map(({ id, name }) => ({ value: id, inputDisplay: name })),
            // A connector that is no longer listed stays selectable, so it is not lost silently.
            ...(current && !known.some(({ id }) => id === current)
              ? [{ value: current, inputDisplay: current }]
              : []),
          ]}
          data-test-subj="contextAutomationConfigureConnector"
        />
      );
    } else if (entry.kind === 'boolean') {
      control = (
        <EuiSwitch
          label={label}
          checked={draft === true}
          disabled={disabled}
          onChange={(event) => setDraft(entry.key, event.target.checked)}
        />
      );
    } else if (entry.kind === 'number') {
      control = (
        <EuiFieldNumber
          fullWidth
          value={String(draft)}
          disabled={disabled}
          isInvalid={errorText !== undefined}
          onChange={(event) => setDraft(entry.key, event.target.value)}
        />
      );
    } else if (entry.kind === 'text' || entry.kind === 'json') {
      control = (
        <EuiTextArea
          fullWidth
          rows={entry.kind === 'json' ? 4 : 12}
          value={String(draft)}
          disabled={disabled}
          isInvalid={errorText !== undefined}
          onChange={(event) => setDraft(entry.key, event.target.value)}
          style={{ fontFamily: 'monospace' }}
        />
      );
    } else {
      control = (
        <EuiFieldText
          fullWidth
          value={String(draft)}
          disabled={disabled}
          onChange={(event) => setDraft(entry.key, event.target.value)}
        />
      );
    }

    return (
      <EuiFormRow
        key={entry.key}
        fullWidth
        label={entry.kind === 'boolean' ? undefined : label}
        helpText={helpText}
        isInvalid={errorText !== undefined}
        error={errorText}
        data-test-subj={`contextAutomationConfigureParameter-${entry.key}`}
      >
        {control}
      </EuiFormRow>
    );
  };

  const body = () => {
    if (isLoading) {
      return <EuiSkeletonText lines={6} />;
    }
    if (error || !parsed) {
      return (
        <KbnDangerCallout
          title={i18n.translate('xpack.contextEngine.automationConfigure.loadError', {
            defaultMessage: 'Unable to load the workflow',
          })}
          text={error ? getErrorMessage(error) : undefined}
        />
      );
    }
    if (parsed.parameters.length === 0 && parsed.schedule === undefined) {
      return (
        <EuiEmptyPrompt
          iconType="gear"
          body={
            <FormattedMessage
              id="xpack.contextEngine.automationConfigure.noParameters"
              defaultMessage="This workflow declares no parameters. Edit it in Workflows instead."
            />
          }
        />
      );
    }
    return (
      <EuiForm component="form" fullWidth onSubmit={(event) => event.preventDefault()}>
        {parsed.schedule !== undefined && (
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.contextEngine.automationConfigure.schedule', {
              defaultMessage: 'Runs every',
            })}
            helpText={i18n.translate('xpack.contextEngine.automationConfigure.scheduleHelp', {
              defaultMessage: 'Minutes, hours or days, such as 30m, 1h or 1d.',
            })}
            isInvalid={scheduleInvalid}
            error={i18n.translate('xpack.contextEngine.automationConfigure.scheduleError', {
              defaultMessage: 'Use a number followed by m, h or d.',
            })}
            data-test-subj="contextAutomationConfigureSchedule"
          >
            <EuiFieldText
              value={schedule ?? ''}
              isInvalid={scheduleInvalid}
              onChange={(event) => setSchedule(event.target.value)}
            />
          </EuiFormRow>
        )}
        {parsed.parameters.map(renderField)}
        {saveError && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              title={i18n.translate('xpack.contextEngine.automationConfigure.saveError', {
                defaultMessage: 'The workflow was not saved',
              })}
              text={saveError.join('\n')}
              data-test-subj="contextAutomationConfigureSaveError"
            />
          </>
        )}
      </EuiForm>
    );
  };

  return (
    <EuiFlyout
      size="m"
      onClose={onClose}
      aria-labelledby={TITLE_ID}
      data-test-subj="contextAutomationConfigureFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={TITLE_ID}>
            <FormattedMessage
              id="xpack.contextEngine.automationConfigure.title"
              defaultMessage="Configure {name}"
              values={{ name: workflowName }}
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.contextEngine.automationConfigure.description"
              defaultMessage="These are the parameters the workflow's steps read. Saving rewrites them in the workflow; installing the template again with the same name resets them."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{body()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={editHref} target="_blank" iconType="external" flush="left">
              <FormattedMessage
                id="xpack.contextEngine.automationConfigure.openInWorkflows"
                defaultMessage="Edit the YAML in Workflows"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose}>
                  <FormattedMessage
                    id="xpack.contextEngine.automationConfigure.cancel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={isSaving}
                  isDisabled={!parsed || hasErrors}
                  onClick={save}
                  data-test-subj="contextAutomationConfigureSave"
                >
                  <FormattedMessage
                    id="xpack.contextEngine.automationConfigure.save"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
