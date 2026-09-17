/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { useTracesEditor } from '../../hooks/use_traces_editor';
import { TraceSelector } from '../trace_selector';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const TracesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: TracesPanelProps) => {
  const { agents } = useAgentBuilderAgents();
  const { currentTrace, startEditing, editing } = useTracesEditor({
    aiIndex,
    onSaved,
  });

  const readOnlyContent = useMemo(() => {
    if (!currentTrace) {
      return null;
    }

    if (currentTrace.type === 'elastic_agent') {
      const agentName =
        agents.find(({ id }) => id === currentTrace.value)?.name ?? currentTrace.value;
      return (
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.traces.agentValueLabel"
          defaultMessage="Elastic agent: {agentName}"
          values={{ agentName }}
        />
      );
    }

    return (
      <FormattedMessage
        id="xpack.contextEngine.aiIndexDetail.traces.dataStreamValueLabel"
        defaultMessage="Data stream: {value}"
        values={{ value: currentTrace.value }}
      />
    );
  }, [agents, currentTrace]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextTracesPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.title"
                defaultMessage="Agent traces"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.description"
                defaultMessage="Traces this AI index learns from. Knowledge Indicators are tuned against the questions agents actually ask."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        {!editing && !isManaged && !isLoading && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={startEditing}
              isDisabled={aiIndex === undefined}
              data-test-subj="contextEditTracesButton"
            >
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.editButton"
                defaultMessage="Edit"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : editing ? (
        <>
          <TraceSelector value={editing.draft} onChange={editing.setDraft} />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={editing.cancel}
                isDisabled={editing.isSaving}
                data-test-subj="contextTracesCancelButton"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.traces.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={editing.save}
                isLoading={editing.isSaving}
                data-test-subj="contextTracesSaveButton"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.traces.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <EuiText size="s" color={readOnlyContent ? undefined : 'subdued'}>
          <p data-test-subj="contextTracesReadOnlyValue">
            {readOnlyContent ??
              (isManaged ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.traces.emptyManaged"
                  defaultMessage="No agent traces configured."
                />
              ) : (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.traces.empty"
                  defaultMessage="No agent traces configured. Point this index at an Elastic agent from Agent Builder, or a data stream carrying OTel GenAI spans."
                />
              ))}
          </p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
