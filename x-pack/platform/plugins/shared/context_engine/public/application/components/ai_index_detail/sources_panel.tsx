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
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useCanReadConnectors } from '../../hooks/use_can_read_connectors';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useSourcesEditor } from '../../hooks/use_sources_editor';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { SourceRows } from './source_rows';
import { SourcePicker } from '../source_picker';
import { SourceTypePanel } from '../source_type_panel';

interface SourcesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const SourcesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: SourcesPanelProps) => {
  const sources = useMemo(() => aiIndex?.sources ?? [], [aiIndex?.sources]);
  const { selectedSources, setSelectedSources, hasChanges, isSaving, save, cancel } =
    useSourcesEditor({ aiIndex: isManaged ? undefined : aiIndex, onSaved });

  const esqlSources = useMemo(() => sources.filter((source) => source.type === 'esql'), [sources]);
  const connectorSources = useMemo(
    () => sources.filter((source) => source.type === 'connector'),
    [sources]
  );

  const canReadConnectors = useCanReadConnectors();
  const { connectorNameById, connectorActionTypeById } = useDataConnectors({
    enabled: isManaged && connectorSources.length > 0 && canReadConnectors,
  });

  return (
    <div data-test-subj="contextSourcesPanel">
      <AiIndexDetailPanelDescription>
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.sources.description"
          defaultMessage="Data that automations should analyze when generating Knowledge Indicators."
        />
      </AiIndexDetailPanelDescription>
      <EuiSpacer size="m" />
      {isLoading && <EuiSkeletonText lines={2} data-test-subj="contextAiIndexSourcesLoading" />}
      {!isLoading && isManaged && (
        <>
          <SourceTypePanel
            title={
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.tabs.elasticsearch"
                defaultMessage="Elasticsearch data"
              />
            }
            badgeCount={esqlSources.length}
            data-test-subj="contextElasticsearchDataPanel"
          >
            <SourceRows
              sources={esqlSources}
              connectorNameById={connectorNameById}
              connectorActionTypeById={connectorActionTypeById}
              emptyMessage={
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.elasticsearchDataEmpty"
                  defaultMessage="No Elasticsearch data sources."
                />
              }
            />
          </SourceTypePanel>
          <EuiSpacer size="m" />
          <SourceTypePanel
            title={
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.tabs.connectors"
                defaultMessage="Connectors"
              />
            }
            badgeCount={connectorSources.length}
            data-test-subj="contextConnectorsPanel"
          >
            <SourceRows
              sources={connectorSources}
              connectorNameById={connectorNameById}
              connectorActionTypeById={connectorActionTypeById}
              emptyMessage={
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.connectorsEmpty"
                  defaultMessage="No connectors."
                />
              }
            />
          </SourceTypePanel>
        </>
      )}
      {!isLoading && !isManaged && (
        <div data-test-subj="contextEditSourcesInlineEditor">
          <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={cancel}
                isDisabled={!hasChanges || isSaving}
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
                onClick={save}
                isLoading={isSaving}
                isDisabled={!hasChanges}
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
      )}
    </div>
  );
};
