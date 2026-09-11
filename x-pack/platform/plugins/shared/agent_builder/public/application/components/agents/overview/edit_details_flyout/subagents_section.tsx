/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiCheckbox,
  EuiComboBox,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import { useAgentBuilderAgents } from '../../../../hooks/agents/use_agents';
import { useExperimentalFeatures } from '../../../../hooks/use_experimental_features';

/**
 * Values written into `configuration.subagent_ids`. Kept as a plain string
 * array to match the persisted shape — the sentinel `_self` participates
 * like any other id.
 */
export type SubagentIdsValue = string[];

interface SubagentsSectionProps<
  TFieldValues extends { configuration: { subagent_ids: SubagentIdsValue } }
> {
  /**
   * Path of the field on the form's default values, as understood by
   * react-hook-form. Defaults to `configuration.subagent_ids`.
   */
  fieldName?: string;
  /**
   * Id of the agent being edited. Used to exclude the agent from the
   * picker's real-id options (users pick `_self` for self-fork; matches the
   * save-time validation rule). Omit on the create form.
   */
  agentId?: string;
  __phantom?: TFieldValues; // preserves the generic without exposing it
}

/**
 * Editor for `configuration.subagent_ids`. Two controls sharing the same
 * data (no separate persisted "enabled" boolean):
 *   - a master "Enable sub-agents" checkbox
 *   - a multi-select revealed by the checkbox, with a fixed `_self` row
 *
 * Interaction rules (§5.1 of the configurable-subagents design):
 *   - On load, the checkbox is derived from `subagent_ids.length > 0`.
 *   - Checking the box appends `_self` to the list (if empty) and reveals
 *     the picker with `_self` selected.
 *   - Unchecking the box clears the list and hides the picker — this is
 *     the ONLY way to hide the picker during editing.
 *   - Deselecting every entry in the picker (including `_self`) leaves
 *     the picker visible; only an explicit uncheck collapses the section.
 */
export const SubagentsSection: React.FC<SubagentsSectionProps<any>> = ({
  fieldName = 'configuration.subagent_ids',
  agentId,
}) => {
  const experimentalOn = useExperimentalFeatures();
  const { agents } = useAgentBuilderAgents();

  const { control, getValues, formState } = useFormContext();
  const checkboxId = useGeneratedHtmlId({ prefix: 'subagentsEnable' });
  const subagentIdsError = (formState.errors as Record<string, any>)?.configuration?.subagent_ids;

  // The initial checkbox state is derived from persisted data; during
  // editing it is a proper UI state so emptying the picker does NOT
  // hide the control.
  const initialValue = (getValues(fieldName) as string[] | undefined) ?? [];
  const [enabled, setEnabled] = useState<boolean>(initialValue.length > 0);

  const options = useMemo(() => {
    const selfOption = {
      value: SELF_AGENT_ID,
      label: i18n.translate('xpack.agentBuilder.subagents.selfOption.label', {
        defaultMessage: 'This agent (self-fork)',
      }),
    };
    const others = (agents ?? [])
      .filter((a) => a.id !== agentId)
      .map((a) => ({ value: a.id, label: `${a.name} (${a.id})` }));
    return [selfOption, ...others];
  }, [agents, agentId]);

  if (!experimentalOn) return null;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="subagentsSection">
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.agentBuilder.subagents.title', {
            defaultMessage: 'Sub-agents',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agentBuilder.subagents.description', {
          defaultMessage:
            'Allow this agent to delegate tasks to other agents. When disabled, this agent cannot spawn sub-agents.',
        })}
      </EuiText>
      <EuiSpacer size="s" />

      <Controller
        name={fieldName}
        control={control}
        render={({ field: { value, onChange } }) => {
          const currentValue = (value as string[] | undefined) ?? [];
          return (
            <>
              <EuiCheckbox
                id={checkboxId}
                label={i18n.translate('xpack.agentBuilder.subagents.enableLabel', {
                  defaultMessage: 'Enable sub-agents',
                })}
                checked={enabled}
                onChange={(e) => {
                  const nowEnabled = e.target.checked;
                  setEnabled(nowEnabled);
                  if (nowEnabled) {
                    if (currentValue.length === 0) {
                      onChange([SELF_AGENT_ID]);
                    }
                  } else {
                    onChange([]);
                  }
                }}
                data-test-subj="subagentsEnableCheckbox"
              />
              {enabled && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFormRow
                    label={i18n.translate('xpack.agentBuilder.subagents.pickerLabel', {
                      defaultMessage: 'Delegable sub-agents',
                    })}
                    helpText={i18n.translate('xpack.agentBuilder.subagents.pickerHelpText', {
                      defaultMessage:
                        "Pick the agents this one may spawn. Use 'This agent (self-fork)' to let it delegate to a copy of itself.",
                    })}
                    isInvalid={!!subagentIdsError}
                    error={subagentIdsError?.message as string | undefined}
                    fullWidth
                  >
                    <EuiComboBox
                      isInvalid={!!subagentIdsError}
                      isClearable
                      options={options}
                      selectedOptions={currentValue.map(
                        (id) =>
                          options.find((o) => o.value === id) ?? {
                            value: id,
                            label: id,
                          }
                      )}
                      onChange={(next) => onChange(next.map((o) => o.value as string))}
                      data-test-subj="subagentsPicker"
                    />
                  </EuiFormRow>
                </>
              )}
            </>
          );
        }}
      />
    </EuiPanel>
  );
};
