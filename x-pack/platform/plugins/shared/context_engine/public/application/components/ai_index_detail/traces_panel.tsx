/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiComboBox,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useAgentBuilderAgents } from '../../hooks/use_agent_builder_agents';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useRunFeedbackAnalysis } from '../../hooks/use_run_feedback_analysis';
import { useUpdateFeedbackAnalysis } from '../../hooks/use_update_feedback_analysis';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/** Which kind of trace source the picker is selecting, mirroring the stored `type`. */
type TraceSourceKind = 'elastic_agent' | 'index';

const TRACE_SOURCE_OPTIONS = [
  {
    id: 'elastic_agent',
    label: i18n.translate('xpack.contextEngine.aiIndexDetail.traces.elasticAgentsOption', {
      defaultMessage: 'Elastic Agents',
    }),
  },
  {
    id: 'index',
    label: i18n.translate('xpack.contextEngine.aiIndexDetail.traces.genAiLibrariesOption', {
      defaultMessage: 'GenAI Libraries',
    }),
  },
];

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
          {/* Only while enabled: turning it off uninstalls the workflow, so there is nothing to run. */}
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
        </>
      )}
    </>
  );
};

/**
 * Which agent traffic, or which trace data stream, this AI index learns from — and whether the
 * analysis that learns from it runs on its own.
 *
 * The selector is a **draft**: it renders the shape the design proposes and keeps its state
 * locally, but nothing is written. Traces are stored as a `{ value, type }` array on the AI index
 * and turned into ES|QL on read, neither of which exists yet; the picker is here so the panel it
 * belongs to can be reviewed alongside the automatic-improvement control, which is real.
 */
export const TracesPanel = ({ isLoading, aiIndex }: TracesPanelProps) => {
  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const [kind, setKind] = useState<TraceSourceKind>('elastic_agent');
  const [selected, setSelected] = useState<EuiComboBoxOptionOption[]>([]);
  const selectorId = useGeneratedHtmlId();

  const { agents, isLoading: isLoadingAgents } = useAgentBuilderAgents();

  const agentOptions = agents.map(({ id, name }) => ({ label: name, value: id }));

  const handleKindChange = (id: string) => {
    setKind(id as TraceSourceKind);
    // What is selected only means something against the kind it was picked for.
    setSelected([]);
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextTracesPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.title', {
            defaultMessage: 'Agent traces',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.description', {
            defaultMessage:
              'The conversations this index is read in. Traces show which questions it was asked and what it returned, which is what automatic improvements are drawn from.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextTracesLoading" />
      ) : (
        <>
          <EuiButtonGroup
            legend={i18n.translate('xpack.contextEngine.aiIndexDetail.traces.selectorLegend', {
              defaultMessage: 'Where traces come from',
            })}
            idSelected={kind}
            options={TRACE_SOURCE_OPTIONS}
            onChange={handleKindChange}
            buttonSize="compressed"
            data-test-subj="contextTracesSourceKind"
          />

          <EuiSpacer size="m" />

          {kind === 'elastic_agent' ? (
            <EuiFormRow
              label={i18n.translate('xpack.contextEngine.aiIndexDetail.traces.agentLabel', {
                defaultMessage: 'Agent',
              })}
              fullWidth
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                isLoading={isLoadingAgents}
                options={agentOptions}
                selectedOptions={selected}
                onChange={setSelected}
                id={selectorId}
                placeholder={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.traces.agentPlaceholder',
                  { defaultMessage: 'Select an agent' }
                )}
                data-test-subj="contextTracesAgentPicker"
              />
            </EuiFormRow>
          ) : (
            <EuiFormRow
              label={i18n.translate('xpack.contextEngine.aiIndexDetail.traces.dataStreamLabel', {
                defaultMessage: 'Trace data stream',
              })}
              fullWidth
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                options={[]}
                selectedOptions={selected}
                onChange={setSelected}
                onCreateOption={(value) => setSelected([{ label: value }])}
                id={selectorId}
                placeholder={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.traces.dataStreamPlaceholder',
                  { defaultMessage: 'traces-genai.otel-default' }
                )}
                data-test-subj="contextTracesDataStreamPicker"
              />
            </EuiFormRow>
          )}

          <EuiText size="xs" color="subdued" data-test-subj="contextTracesDraftNote">
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.draftNote', {
                defaultMessage:
                  'Draft: this selector shows the proposed design. What you choose here is not saved yet.',
              })}
            </p>
          </EuiText>
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
