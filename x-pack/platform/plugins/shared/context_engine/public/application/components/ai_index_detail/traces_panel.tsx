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
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useRunFeedbackAnalysis } from '../../hooks/use_run_feedback_analysis';
import { useTracesEditor } from '../../hooks/use_traces_editor';
import { useUpdateFeedbackAnalysis } from '../../hooks/use_update_feedback_analysis';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { AiIndexDetailPanelEmptyState } from './ai_index_detail_panel_empty_prompt';
import { TraceDisplay } from '../trace_display';
import { TraceSelector } from '../trace_selector';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

/**
 * Whether this index's traces are reviewed on a schedule, plus a way to review them now.
 *
 * Which agent runs, how often, and how far back it reads are all defaulted server-side and not
 * offered here. They are per-index overrides of settings that already have sensible values, and an
 * index whose analysis needs different ones is the exception; the API still accepts all three, so
 * that exception has somewhere to go without putting three controls in front of everyone else.
 *
 * Its own component because the mutations it needs are keyed on a loaded AI index, which the panel
 * does not have while the page is still fetching.
 */
const AutoImproveControl = ({ aiIndex }: { aiIndex: GetAiIndexResponse }) => {
  const updateConfig = useUpdateFeedbackAnalysis(aiIndex);
  const runAnalysis = useRunFeedbackAnalysis(aiIndex.id);
  const isAnalysisEnabled = aiIndex.feedback_analysis?.enabled ?? false;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiSwitch
            checked={isAnalysisEnabled}
            disabled={updateConfig.isLoading}
            onChange={(event) => updateConfig.mutate({ enabled: event.target.checked })}
            label={i18n.translate('xpack.contextEngine.aiIndexDetail.traces.autoImproveLabel', {
              defaultMessage: 'Suggest improvements automatically',
            })}
            data-test-subj="contextTracesAutoImproveSwitch"
          />
        </EuiFlexItem>

        {isAnalysisEnabled && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="play"
              onClick={() => runAnalysis.mutate()}
              isLoading={runAnalysis.isLoading}
              data-test-subj="contextImprovementsRunNowButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.runNowButton', {
                defaultMessage: 'Run now',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.autoImproveHelp', {
            defaultMessage:
              'Reviews recent queries on a schedule and proposes changes in the panels above. Suggestions are never applied on their own.',
          })}
        </p>
      </EuiText>
    </>
  );
};

export const TracesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: TracesPanelProps) => {
  const { currentTrace, startEditing, editing } = useTracesEditor({
    aiIndex,
    onSaved,
  });
  const isEditingActive = editing !== undefined && !editing.isSaving;
  const hasTrace = currentTrace !== undefined;
  const isSaving = editing?.isSaving ?? false;

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
          <AiIndexDetailPanelDescription>
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.traces.description"
              defaultMessage="Used to identify gaps in the context agents retrieve from this AI index."
            />
          </AiIndexDetailPanelDescription>
        </EuiFlexItem>
        {!isEditingActive && !isManaged && !isLoading && hasTrace && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={startEditing}
              isLoading={isSaving}
              isDisabled={aiIndex === undefined}
              data-test-subj="contextEditTracesButton"
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageTracesPanel,
                action: CONTEXT_ENGINE_UI_EBT.action.traces.EDIT,
              })}
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
      ) : isEditingActive ? (
        <>
          <TraceSelector
            value={editing.draft}
            onChange={editing.setDraft}
            ebtElement={CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageTracesPanel}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={editing.cancel}
                data-test-subj="contextTracesCancelButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageTracesPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.traces.CANCEL,
                })}
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
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageTracesPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.traces.SAVE,
                })}
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
        <>
          <EuiSpacer size="m" />
          <AiIndexDetailPanelEmptyState
            iconType="chartWaterfall"
            dataTestSubj="contextAiIndexTracesEmpty"
            message={
              isManaged ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.traces.emptyManaged"
                  defaultMessage="No agent traces configured."
                />
              ) : (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.traces.empty"
                  defaultMessage="No agent traces configured."
                />
              )
            }
            action={
              isManaged ? undefined : (
                <EuiButtonEmpty
                  size="s"
                  iconType="plusCircle"
                  onClick={startEditing}
                  isLoading={isSaving}
                  isDisabled={aiIndex === undefined}
                  data-test-subj="contextAddTracesButton"
                  {...getEbtProps({
                    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageTracesPanel,
                    action: CONTEXT_ENGINE_UI_EBT.action.traces.EDIT,
                  })}
                >
                  <FormattedMessage
                    id="xpack.contextEngine.aiIndexDetail.traces.addButton"
                    defaultMessage="Add traces"
                  />
                </EuiButtonEmpty>
              )
            }
          />
        </>
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
