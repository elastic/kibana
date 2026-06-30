/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { WorkflowComboBox } from '@kbn/agent-builder-browser';
import type { WorkflowComboBoxOption } from '@kbn/agent-builder-browser';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  ConversationWorkflowHookDefinition,
  ConversationWorkflowHookExecutionState,
  ConversationWorkflowHookTrigger,
} from '@kbn/agent-builder-common/chat/conversation_metadata';
import { i18n } from '@kbn/i18n';
import { usePatchConversationMetadata } from '../../../hooks/use_patch_conversation_metadata';
import { useListWorkflows } from '../../../hooks/tools/use_list_workflows';

const triggerOptions: Array<{ value: ConversationWorkflowHookTrigger; text: string }> = [
  {
    value: 'schedule',
    text: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.scheduleTrigger', {
      defaultMessage: 'Schedule',
    }),
  },
  {
    value: 'manual_refresh',
    text: i18n.translate(
      'xpack.agentBuilder.conversationDetail.workflowHooks.manualRefreshTrigger',
      {
        defaultMessage: 'Manual refresh',
      }
    ),
  },
  {
    value: 'conversation.created',
    text: i18n.translate(
      'xpack.agentBuilder.conversationDetail.workflowHooks.conversationCreatedTrigger',
      {
        defaultMessage: 'Conversation created',
      }
    ),
  },
  {
    value: 'incident.created',
    text: i18n.translate(
      'xpack.agentBuilder.conversationDetail.workflowHooks.incidentCreatedTrigger',
      {
        defaultMessage: 'Incident created',
      }
    ),
  },
];

const labels = {
  linkedHooksTitle: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.linkedHooksTitle',
    {
      defaultMessage: 'Linked workflow hooks',
    }
  ),
  noHooks: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.noHooksLabel', {
    defaultMessage: 'No workflow hooks linked.',
  }),
  addHookTitle: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.addHookTitle', {
    defaultMessage: 'Add hook',
  }),
  workflowLabel: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.workflowLabel',
    {
      defaultMessage: 'Workflow',
    }
  ),
  hookIdLabel: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.hookIdLabel', {
    defaultMessage: 'Hook ID',
  }),
  triggerLabel: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.triggerLabel', {
    defaultMessage: 'Trigger',
  }),
  intervalLabel: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.intervalLabel',
    {
      defaultMessage: 'Interval',
    }
  ),
  addButton: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.addButtonLabel', {
    defaultMessage: 'Add workflow hook',
  }),
  enabled: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.enabledLabel', {
    defaultMessage: 'Enabled',
  }),
  templateHook: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.templateHookLabel',
    {
      defaultMessage: 'Template',
    }
  ),
  conversationHook: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.conversationHookLabel',
    {
      defaultMessage: 'Conversation',
    }
  ),
  rawJsonLabel: i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.rawJsonLabel', {
    defaultMessage: 'Conversation hook JSON',
  }),
  saveJsonButton: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.saveJsonButtonLabel',
    {
      defaultMessage: 'Save JSON',
    }
  ),
  invalidJsonTitle: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.invalidJsonTitle',
    {
      defaultMessage: 'Invalid workflow hook JSON',
    }
  ),
  invalidJsonBody: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.invalidJsonBody',
    {
      defaultMessage: 'Enter an array of hooks. Each hook needs at least an id and trigger.',
    }
  ),
  workflowPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.workflowPlaceholder',
    {
      defaultMessage: 'Select a workflow',
    }
  ),
  removeHookLabel: (hookId: string) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.removeHookLabel', {
      defaultMessage: 'Remove workflow hook {hookId}',
      values: { hookId },
    }),
  disableTemplateHookLabel: (hookId: string) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.disableTemplateHookLabel', {
      defaultMessage: 'Disable template workflow hook {hookId}',
      values: { hookId },
    }),
  fallbackWorkflowName: (workflowId: string) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.workflowHooks.workflowFallbackName', {
      defaultMessage: 'Workflow {workflowId}',
      values: { workflowId },
    }),
  inlineWorkflowName: i18n.translate(
    'xpack.agentBuilder.conversationDetail.workflowHooks.inlineWorkflowName',
    {
      defaultMessage: 'Inline workflow',
    }
  ),
};

interface DisplayWorkflowHook {
  hook: ConversationWorkflowHookDefinition;
  source: 'template' | 'conversation';
  hasTemplateDefault: boolean;
  state?: ConversationWorkflowHookExecutionState;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeWorkflowHooks = (value: unknown): ConversationWorkflowHookDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isWorkflowHookDefinition).map(normalizeWorkflowHook);
};

const isWorkflowHookDefinition = (value: unknown): value is ConversationWorkflowHookDefinition => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === 'string' && typeof value.trigger === 'string';
};

const normalizeWorkflowHook = (
  hook: ConversationWorkflowHookDefinition
): ConversationWorkflowHookDefinition => {
  return {
    id: hook.id,
    trigger: hook.trigger,
    ...(hook.enabled !== undefined ? { enabled: hook.enabled } : {}),
    ...(hook.interval ? { interval: hook.interval } : {}),
    ...(hook.workflow_id ? { workflow_id: hook.workflow_id } : {}),
    ...(hook.inline_workflow_yaml ? { inline_workflow_yaml: hook.inline_workflow_yaml } : {}),
    ...(hook.workflow_name ? { workflow_name: hook.workflow_name } : {}),
    ...(hook.wait_for_completion !== undefined
      ? { wait_for_completion: hook.wait_for_completion }
      : {}),
    ...(hook.completion_timeout_sec !== undefined
      ? { completion_timeout_sec: hook.completion_timeout_sec }
      : {}),
    ...(hook.params ? { params: hook.params } : {}),
    ...(hook.merge_output !== undefined ? { merge_output: hook.merge_output } : {}),
  };
};

const getHookState = (
  workflowHookState: unknown,
  hookId: string
): ConversationWorkflowHookExecutionState | undefined => {
  if (!isRecord(workflowHookState)) {
    return undefined;
  }

  const state = workflowHookState[hookId];
  if (!isRecord(state)) {
    return undefined;
  }

  return {
    ...(typeof state.last_run_at === 'string' ? { last_run_at: state.last_run_at } : {}),
    ...(typeof state.last_execution_id === 'string'
      ? { last_execution_id: state.last_execution_id }
      : {}),
    ...(typeof state.last_status === 'string' ? { last_status: state.last_status } : {}),
    ...(typeof state.last_error === 'string' ? { last_error: state.last_error } : {}),
    ...(typeof state.run_count === 'number' ? { run_count: state.run_count } : {}),
  };
};

const buildDisplayHooks = ({
  templateHooks,
  customHooks,
  workflowHookState,
}: {
  templateHooks: ConversationWorkflowHookDefinition[];
  customHooks: ConversationWorkflowHookDefinition[];
  workflowHookState: unknown;
}): DisplayWorkflowHook[] => {
  const hooks = new Map<string, DisplayWorkflowHook>();

  templateHooks.forEach((hook) => {
    hooks.set(hook.id, {
      hook,
      source: 'template',
      hasTemplateDefault: true,
      state: getHookState(workflowHookState, hook.id),
    });
  });

  customHooks.forEach((hook) => {
    hooks.set(hook.id, {
      hook,
      source: 'conversation',
      hasTemplateDefault: templateHooks.some((templateHook) => templateHook.id === hook.id),
      state: getHookState(workflowHookState, hook.id),
    });
  });

  return [...hooks.values()];
};

const upsertHook = (
  hooks: ConversationWorkflowHookDefinition[],
  hook: ConversationWorkflowHookDefinition
): ConversationWorkflowHookDefinition[] => {
  const next = hooks.filter((item) => item.id !== hook.id);
  return [...next, normalizeWorkflowHook(hook)];
};

const removeHook = (
  hooks: ConversationWorkflowHookDefinition[],
  hookId: string
): ConversationWorkflowHookDefinition[] => {
  return hooks.filter((hook) => hook.id !== hookId);
};

const formatHooksJson = (hooks: ConversationWorkflowHookDefinition[]): string => {
  return JSON.stringify(hooks, null, 2);
};

const formatJson = (value: unknown): string => {
  return JSON.stringify(value, null, 2);
};

const parseHooksJson = (value: string): ConversationWorkflowHookDefinition[] | undefined => {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((hook) => !isWorkflowHookDefinition(hook))) {
    return undefined;
  }

  return parsed.map(normalizeWorkflowHook);
};

const buildHookId = ({ workflowId, trigger }: { workflowId: string; trigger: string }): string => {
  return `${trigger}-${workflowId}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getWorkflowName = ({
  hook,
  workflows,
}: {
  hook: ConversationWorkflowHookDefinition;
  workflows: WorkflowComboBoxOption[];
}): string => {
  if (hook.workflow_name) {
    return hook.workflow_name;
  }

  if (hook.workflow_id) {
    return (
      workflows.find((workflow) => workflow.id === hook.workflow_id)?.name ??
      labels.fallbackWorkflowName(hook.workflow_id)
    );
  }

  if (hook.inline_workflow_yaml) {
    return labels.inlineWorkflowName;
  }

  return hook.id;
};

const getHookSummary = (hook: ConversationWorkflowHookDefinition): string => {
  return [hook.trigger, hook.interval].filter(Boolean).join(' | ');
};

export const ConversationWorkflowHooks = ({ conversation }: { conversation: Conversation }) => {
  const { mutate, isLoading: isSaving } = usePatchConversationMetadata();
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useListWorkflows();
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [hookId, setHookId] = useState('');
  const [trigger, setTrigger] = useState<ConversationWorkflowHookTrigger>('schedule');
  const [interval, setInterval] = useState('5m');
  const [jsonError, setJsonError] = useState<string | undefined>();

  const templateHooks = useMemo(
    () => normalizeWorkflowHooks(conversation.template_snapshot?.workflow_hooks),
    [conversation.template_snapshot?.workflow_hooks]
  );
  const customHooks = useMemo(
    () => normalizeWorkflowHooks(conversation.custom_fields?.workflow_hooks),
    [conversation.custom_fields?.workflow_hooks]
  );
  const displayHooks = useMemo(
    () =>
      buildDisplayHooks({
        templateHooks,
        customHooks,
        workflowHookState: conversation.custom_fields?.workflow_hook_state,
      }),
    [conversation.custom_fields?.workflow_hook_state, customHooks, templateHooks]
  );
  const [hooksJson, setHooksJson] = useState(formatHooksJson(customHooks));

  useEffect(() => {
    setHooksJson(formatHooksJson(customHooks));
    setJsonError(undefined);
  }, [customHooks]);

  const patchHooks = useCallback(
    (hooks: ConversationWorkflowHookDefinition[]) => {
      mutate({ workflow_hooks: hooks });
    },
    [mutate]
  );

  const handleAddHook = useCallback(() => {
    const workflowId = selectedWorkflowIds[0];
    if (!workflowId) {
      return;
    }

    const nextHookId = hookId.trim() || buildHookId({ workflowId, trigger });
    const workflow = workflows.find((item) => item.id === workflowId);
    const nextHook: ConversationWorkflowHookDefinition = {
      id: nextHookId,
      trigger,
      workflow_id: workflowId,
      ...(workflow?.name ? { workflow_name: workflow.name } : {}),
      enabled: true,
      wait_for_completion: true,
      merge_output: true,
      ...(trigger === 'schedule' ? { interval } : {}),
    };

    patchHooks(upsertHook(customHooks, nextHook));
    setSelectedWorkflowIds([]);
    setHookId('');
  }, [customHooks, hookId, interval, patchHooks, selectedWorkflowIds, trigger, workflows]);

  const handleTriggerChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTrigger(event.target.value);
  }, []);

  const toggleHookEnabled = useCallback(
    (hook: ConversationWorkflowHookDefinition, enabled: boolean) => {
      patchHooks(upsertHook(customHooks, { ...hook, enabled }));
    },
    [customHooks, patchHooks]
  );

  const handleRemoveHook = useCallback(
    (displayHook: DisplayWorkflowHook) => {
      if (displayHook.hasTemplateDefault) {
        patchHooks(upsertHook(customHooks, { ...displayHook.hook, enabled: false }));
        return;
      }

      patchHooks(removeHook(customHooks, displayHook.hook.id));
    },
    [customHooks, patchHooks]
  );

  const handleSaveJson = useCallback(() => {
    try {
      const nextHooks = parseHooksJson(hooksJson);
      if (!nextHooks) {
        setJsonError(labels.invalidJsonBody);
        return;
      }

      setJsonError(undefined);
      patchHooks(nextHooks);
    } catch {
      setJsonError(labels.invalidJsonBody);
    }
  }, [hooksJson, patchHooks]);

  return (
    <EuiForm component="div">
      <EuiText size="s">
        <h4>{labels.linkedHooksTitle}</h4>
      </EuiText>
      <EuiSpacer size="s" />

      {displayHooks.length === 0 ? (
        <EuiText size="s" color="subdued">
          {labels.noHooks}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          {displayHooks.map((displayHook) => {
            const { hook, state } = displayHook;
            const isEnabled = hook.enabled !== false;
            return (
              <EuiFlexItem key={hook.id} grow={false}>
                <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{getWorkflowName({ hook, workflows })}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {hook.id}
                        {getHookSummary(hook) ? ` | ${getHookSummary(hook)}` : ''}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={displayHook.source === 'template' ? 'hollow' : 'default'}>
                        {displayHook.source === 'template'
                          ? labels.templateHook
                          : labels.conversationHook}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        aria-label={
                          displayHook.hasTemplateDefault
                            ? labels.disableTemplateHookLabel(hook.id)
                            : labels.removeHookLabel(hook.id)
                        }
                        onClick={() => handleRemoveHook(displayHook)}
                        isDisabled={isSaving}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiSwitch
                    compressed
                    label={labels.enabled}
                    checked={isEnabled}
                    disabled={isSaving}
                    onChange={(event) => toggleHookEnabled(hook, event.target.checked)}
                  />
                  {state && (
                    <>
                      <EuiSpacer size="xs" />
                      <EuiCodeBlock
                        language="json"
                        paddingSize="s"
                        fontSize="s"
                        transparentBackground
                      >
                        {formatJson(state)}
                      </EuiCodeBlock>
                    </>
                  )}
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}

      <EuiHorizontalRule margin="m" />

      <EuiText size="s">
        <h4>{labels.addHookTitle}</h4>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFormRow label={labels.workflowLabel} fullWidth>
        <WorkflowComboBox
          workflows={workflows}
          value={selectedWorkflowIds}
          onChange={setSelectedWorkflowIds}
          singleSelection
          isLoading={isLoadingWorkflows}
          isDisabled={isSaving}
          isClearable
          placeholder={labels.workflowPlaceholder}
        />
      </EuiFormRow>
      <EuiFormRow label={labels.triggerLabel} fullWidth>
        <EuiSelect
          fullWidth
          compressed
          value={trigger}
          options={triggerOptions}
          disabled={isSaving}
          onChange={handleTriggerChange}
        />
      </EuiFormRow>
      {trigger === 'schedule' && (
        <EuiFormRow label={labels.intervalLabel} fullWidth>
          <EuiFieldText
            fullWidth
            compressed
            value={interval}
            disabled={isSaving}
            onChange={(event) => setInterval(event.target.value)}
          />
        </EuiFormRow>
      )}
      <EuiFormRow label={labels.hookIdLabel} fullWidth>
        <EuiFieldText
          fullWidth
          compressed
          value={hookId}
          disabled={isSaving}
          onChange={(event) => setHookId(event.target.value)}
        />
      </EuiFormRow>
      <EuiButton
        size="s"
        iconType="plusInCircle"
        onClick={handleAddHook}
        isDisabled={!selectedWorkflowIds[0] || isSaving}
        isLoading={isSaving}
      >
        {labels.addButton}
      </EuiButton>

      <EuiHorizontalRule margin="m" />

      <EuiFormRow label={labels.rawJsonLabel} fullWidth isInvalid={!!jsonError} error={jsonError}>
        <EuiTextArea
          fullWidth
          value={hooksJson}
          rows={8}
          resize="vertical"
          disabled={isSaving}
          isInvalid={!!jsonError}
          onChange={(event) => setHooksJson(event.target.value)}
        />
      </EuiFormRow>
      {jsonError && (
        <>
          <EuiCallOut color="danger" size="s" title={labels.invalidJsonTitle}>
            <p>{jsonError}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiButton size="s" onClick={handleSaveJson} isLoading={isSaving}>
        {labels.saveJsonButton}
      </EuiButton>
    </EuiForm>
  );
};
