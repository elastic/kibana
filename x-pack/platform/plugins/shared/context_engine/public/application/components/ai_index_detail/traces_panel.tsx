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
import React, { useMemo, useState } from 'react';
import type { AiIndexTrace, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { useSaveAiIndexTraces } from '../../hooks/use_save_ai_index_traces';
import { TraceSelector } from '../trace_selector';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

const toTrace = (aiIndex: GetAiIndexResponse | undefined): AiIndexTrace | undefined => {
  const trace = aiIndex?.traces[0];
  return trace ? { type: trace.type, value: trace.value } : undefined;
};

export const TracesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: TracesPanelProps) => {
  const { saveTraces, isSaving } = useSaveAiIndexTraces();
  const { agents } = useAgentBuilderAgents();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AiIndexTrace | undefined>();

  const currentTrace = useMemo(() => toTrace(aiIndex), [aiIndex]);

  const startEditing = () => {
    setDraft(currentTrace);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!aiIndex) {
      return;
    }
    const saved = await saveTraces(aiIndex, draft);
    if (saved) {
      setIsEditing(false);
      onSaved();
    }
  };

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

    if (currentTrace.type === 'index') {
      return (
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.traces.dataStreamValueLabel"
          defaultMessage="Data stream: {value}"
          values={{ value: currentTrace.value }}
        />
      );
    }

    return currentTrace.value;
  }, [agents, currentTrace]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextTracesPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.title"
                defaultMessage="Agent Traces"
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
        {!isEditing && !isManaged && !isLoading && (
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
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : isEditing ? (
        <>
          <TraceSelector value={draft} onChange={setDraft} />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => setIsEditing(false)}
                isDisabled={isSaving}
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
                onClick={handleSave}
                isLoading={isSaving}
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
                  defaultMessage="No agent traces configured. Add one to tune Knowledge Indicators against real agent questions."
                />
              ))}
          </p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
