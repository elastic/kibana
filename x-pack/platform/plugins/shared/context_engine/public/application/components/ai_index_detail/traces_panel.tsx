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
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useKibana } from '../../hooks/use_kibana';
import { useTracesEditor } from '../../hooks/use_traces_editor';
import { useUpdateFeedbackAnalysis } from '../../hooks/use_update_feedback_analysis';
import { TraceDisplay } from '../trace_display';
import { TraceSelector } from '../trace_selector';
import { FeedbackAnalysisConfig } from './feedback_analysis_config';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

const AutoImproveControl = ({ aiIndex }: { aiIndex: GetAiIndexResponse }) => {
  const {
    services: { getChatOpener },
  } = useKibana();
  const chatOpener = getChatOpener?.();
  const updateConfig = useUpdateFeedbackAnalysis(aiIndex);
  const isAnalysisEnabled = aiIndex.feedback_analysis?.enabled ?? false;

  return (
    <>
      <EuiSwitch
        checked={isAnalysisEnabled}
        disabled={updateConfig.isLoading}
        onChange={(event) => updateConfig.mutate({ enabled: event.target.checked })}
        label={i18n.translate('xpack.contextEngine.aiIndexDetail.traces.autoImproveLabel', {
          defaultMessage: 'Suggest improvements automatically',
        })}
        data-test-subj="contextTracesAutoImproveSwitch"
      />

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.autoImproveHelp', {
            defaultMessage:
              'Reviews these traces on a schedule and proposes changes in the panels above. Suggestions are never applied on their own.',
          })}
        </p>
      </EuiText>

      {isAnalysisEnabled && (
        <>
          <EuiSpacer size="m" />
          <FeedbackAnalysisConfig aiIndex={aiIndex} showAgentSelector={Boolean(chatOpener)} />
        </>
      )}
    </>
  );
};

export const TracesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: TracesPanelProps) => {
  const { currentTrace, startEditing, editing } = useTracesEditor({
    aiIndex,
    onSaved,
  });

  const feedbackLoopEnabled = useFeedbackLoopEnabled();

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
      ) : currentTrace ? (
        <TraceDisplay trace={currentTrace} />
      ) : (
        <EuiText size="s" color="subdued">
          <p data-test-subj="contextTracesReadOnlyValue">
            {isManaged ? (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.emptyManaged"
                defaultMessage="No agent traces configured."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.empty"
                defaultMessage="No agent traces configured. Point this index at an Elastic agent from Agent Builder, or a data stream carrying OTel GenAI spans."
              />
            )}
          </p>
        </EuiText>
      )}

      {feedbackLoopEnabled && aiIndex && (
        <>
          <EuiHorizontalRule margin="m" />
          <AutoImproveControl aiIndex={aiIndex} />
        </>
      )}
    </EuiPanel>
  );
};
