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
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useTracesEditor } from '../../hooks/use_traces_editor';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { AiIndexDetailPanelEmptyPrompt } from './ai_index_detail_panel_empty_prompt';
import { TraceDisplay } from '../trace_display';
import { TraceSelector } from '../trace_selector';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const TracesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: TracesPanelProps) => {
  const { currentTrace, startEditing, editing } = useTracesEditor({
    aiIndex,
    onSaved,
  });
  const isEditingActive = editing !== undefined && !editing.isSaving;
  const hasTrace = currentTrace !== undefined;
  const isSaving = editing?.isSaving ?? false;

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
            {!isLoading && !hasTrace ? (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.descriptionEmpty"
                defaultMessage="Add traces to identify gaps in the context agents retrieve from this AI index."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.description"
                defaultMessage="Traces used to identify gaps in the context agents retrieve from this AI index."
              />
            )}
          </AiIndexDetailPanelDescription>
        </EuiFlexItem>
        {!isEditingActive && !isManaged && !isLoading && (
          <EuiFlexItem grow={false}>
            {hasTrace ? (
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
            ) : (
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
            )}
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
        <AiIndexDetailPanelEmptyPrompt
          iconType="chartWaterfall"
          dataTestSubj="contextAiIndexTracesEmpty"
          title={
            isManaged ? (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.emptyManaged"
                defaultMessage="No agent traces configured."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.traces.empty"
                defaultMessage="No agent traces yet"
              />
            )
          }
        />
      )}
    </EuiPanel>
  );
};
