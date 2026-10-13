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
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useCanReadConnectors } from '../../hooks/use_can_read_connectors';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useSourcesEditor } from '../../hooks/use_sources_editor';
import { toSourceType } from '../../utils/sources';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { AiIndexDetailPanelEmptyState } from './ai_index_detail_panel_empty_prompt';
import { SourcePicker } from '../source_picker';
import { getSourceDisplay } from '../source_display';
import { SourceRow } from '../source_row';

interface SourcesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const SourcesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: SourcesPanelProps) => {
  const sources = useMemo(() => aiIndex?.sources ?? [], [aiIndex?.sources]);
  const { startEditing, editing } = useSourcesEditor({ aiIndex, onSaved });
  const isEditingActive = editing !== undefined && !editing.isSaving;
  const hasSources = sources.length > 0;

  const hasConnectorSources = useMemo(
    () => sources.some((source) => source.type === 'connector'),
    [sources]
  );
  const canReadConnectors = useCanReadConnectors();
  const { connectorNameById, connectorActionTypeById } = useDataConnectors({
    enabled: hasConnectorSources && !isEditingActive && canReadConnectors,
  });

  const isSaving = editing?.isSaving ?? false;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSourcesPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        {/* minWidth: 0 keeps the description from running underneath the actions column */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.title"
                defaultMessage="Sources"
              />
            </h2>
          </EuiTitle>
          <AiIndexDetailPanelDescription>
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.description"
              defaultMessage="Data that automations should analyze when generating Knowledge Indicators."
            />
          </AiIndexDetailPanelDescription>
        </EuiFlexItem>
        {!isEditingActive && !isManaged && !isLoading && aiIndex !== undefined && hasSources && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={startEditing}
              isLoading={isSaving}
              data-test-subj="contextEditSourcesButton"
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
                action: CONTEXT_ENGINE_UI_EBT.action.sources.EDIT,
              })}
            >
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.editButton"
                defaultMessage="Edit"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexSourcesLoading" />
      ) : isEditingActive ? (
        <div data-test-subj="contextEditSourcesInlineEditor">
          <SourcePicker
            selectedSources={editing.selectedSources}
            onChange={editing.setSelectedSources}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={editing.cancel}
                data-test-subj="contextEditSourcesCancelButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.sources.CANCEL,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.cancelButton"
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
                isDisabled={!editing.hasChanges}
                data-test-subj="contextEditSourcesDoneButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.sources.SAVE,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : sources.length === 0 ? (
        <>
          <EuiSpacer size="m" />
          <AiIndexDetailPanelEmptyState
            iconType="tablePlus"
            dataTestSubj="contextAiIndexSourcesEmpty"
            message={
              isManaged ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.emptyManaged"
                  defaultMessage="No sources configured."
                />
              ) : (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.empty"
                  defaultMessage="No sources configured."
                />
              )
            }
            action={
              isManaged ? undefined : (
                <EuiButton
                  size="s"
                  fill
                  iconType="plusCircle"
                  onClick={startEditing}
                  isLoading={isSaving}
                  data-test-subj="contextAddSourcesButton"
                  {...getEbtProps({
                    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
                    action: CONTEXT_ENGINE_UI_EBT.action.sources.EDIT,
                  })}
                >
                  <FormattedMessage
                    id="xpack.contextEngine.aiIndexDetail.sources.addButton"
                    defaultMessage="Add sources"
                  />
                </EuiButton>
              )
            }
          />
        </>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {sources.map((source) => {
            const { label, typeLabel, icon, content } = getSourceDisplay(
              toSourceType(source.type),
              source.value,
              { connectorNameById, connectorActionTypeById }
            );
            return (
              <EuiFlexItem key={`${source.type}-${source.value}`}>
                <SourceRow
                  label={label}
                  typeLabel={typeLabel}
                  icon={icon}
                  data-test-subj="contextAiIndexSourceRow"
                >
                  {content}
                </SourceRow>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
