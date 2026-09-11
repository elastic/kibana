/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCheckbox,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import { useAgentBuilderAgents } from '../../../../hooks/agents/use_agents';
import { useExperimentalFeatures } from '../../../../hooks/use_experimental_features';
import type { AgentFormData } from '../agent_form';

interface SubagentsSectionProps {
  /** Undefined while creating an agent; used to exclude the agent's own id from the picker. */
  agentId?: string;
}

/**
 * Full-page-editor variant of the sub-agents section. Matches the two-column
 * (icon + title on the left, controls on the right) layout used by the other
 * sections in `settings_tab.tsx` (see `AiIndicesSection`). The flyout has its
 * own variant under `overview/edit_details_flyout/subagents_section.tsx` — the
 * codebase convention here is one file per surface (see `ai_indices_section`
 * duplication) rather than a shared component.
 */
export const SubagentsSection: React.FC<SubagentsSectionProps> = ({ agentId }) => {
  const experimentalOn = useExperimentalFeatures();
  const { agents } = useAgentBuilderAgents();

  const { control, formState } = useFormContext<AgentFormData>();
  const checkboxId = useGeneratedHtmlId({ prefix: 'subagentsEnable' });
  const subagentIdsErrorNode = formState.errors.configuration?.subagent_ids as unknown;
  const subagentIdsErrorMessage = findFirstErrorMessage(subagentIdsErrorNode);

  // Watch the underlying field so we notice async data loads (the parent form
  // populates via `reset()` after the agent fetch resolves — `useState`'s
  // once-only initializer misses that transition).
  const watchedValue =
    (useWatch({ control, name: 'configuration.subagent_ids' }) as string[] | undefined) ?? [];
  const hasValues = watchedValue.length > 0;

  // Transient UI state initialized from data — during editing only the
  // checkbox toggles visibility. Emptying the picker mid-edit keeps the
  // control open so the user can add another entry.
  const [enabled, setEnabled] = useState<boolean>(hasValues);
  // If the initial mount happened before the async agent fetch resolved,
  // `hasValues` was false. Flip `enabled` on once values arrive; do NOT
  // flip it off when the picker later empties (that's the whole point of
  // the "checkbox is the only collapse control" behavior — §5.1).
  useEffect(() => {
    if (hasValues) setEnabled(true);
  }, [hasValues]);

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
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="subagents-section-title"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="users" aria-hidden={true} />
              <EuiTitle size="xs">
                <h2 id="subagents-section-title">
                  {i18n.translate('xpack.agentBuilder.subagents.title', {
                    defaultMessage: 'Sub-agents',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.agentBuilder.subagents.description', {
                  defaultMessage:
                    'Allow this agent to delegate tasks to other agents. When disabled, this agent cannot spawn sub-agents.',
                })}
              </p>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2} css={{ minWidth: 0 }}>
          <Controller
            name="configuration.subagent_ids"
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
                      const next = nowEnabled
                        ? currentValue.length === 0
                          ? [SELF_AGENT_ID]
                          : currentValue
                        : [];
                      onChange(next);
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
                        helpText={i18n.translate(
                          'xpack.agentBuilder.subagents.pickerHelpText',
                          {
                            defaultMessage:
                              "Pick the agents this one may spawn. Use 'This agent (self-fork)' to let it delegate to a copy of itself.",
                          }
                        )}
                        isInvalid={!!subagentIdsErrorNode}
                        error={subagentIdsErrorMessage}
                        fullWidth
                      >
                        <EuiComboBox
                          isClearable
                          options={options}
                          selectedOptions={currentValue.map(
                            (id) =>
                              options.find((o) => o.value === id) ?? {
                                value: id,
                                label: id,
                              }
                          )}
                          onChange={(next) => {
                            const nextIds = next
                              .map((o) => o.value)
                              .filter(
                                (v): v is string =>
                                  typeof v === 'string' && v.length > 0
                              );
                            onChange(nextIds);
                          }}
                          data-test-subj="subagentsPicker"
                        />
                      </EuiFormRow>
                    </>
                  )}
                </>
              );
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

/**
 * RHF nests errors following the schema path. For an array field, the error
 * can end up at the array itself (`.message` present) OR at a nested item
 * (`.message` only under a numeric child key). This walks the shape to find
 * the first string `message` so `EuiFormRow`'s `error` prop always gets text.
 */
const findFirstErrorMessage = (node: unknown): string | undefined => {
  if (!node) return undefined;
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return undefined;
  const anyNode = node as Record<string, unknown>;
  if (typeof anyNode.message === 'string' && anyNode.message.length > 0) {
    return anyNode.message;
  }
  for (const key of Object.keys(anyNode)) {
    const found = findFirstErrorMessage(anyNode[key]);
    if (found) return found;
  }
  return undefined;
};
