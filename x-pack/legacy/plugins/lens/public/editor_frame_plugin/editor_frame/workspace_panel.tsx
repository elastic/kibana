/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiBetaBadge,
  EuiButtonEmpty,
} from '@elastic/eui';
import { toExpression } from '@kbn/interpreter/common';
import { CoreStart, CoreSetup } from 'src/core/public';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/expressions/public';
import { Action } from './state_management';
import { Datasource, Visualization, FramePublicAPI } from '../../types';
import { DragDrop, DragContext } from '../../drag_drop';
import { getSuggestions, switchToSuggestion } from './suggestion_helpers';
import { buildExpression } from './expression_helpers';
import { debouncedComponent } from '../../debounced_component';
import { trackUiEvent } from '../../lens_ui_telemetry';

export interface WorkspacePanelProps {
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  activeDatasourceId: string | null;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      state: unknown;
      isLoading: boolean;
    }
  >;
  framePublicAPI: FramePublicAPI;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
  core: CoreStart | CoreSetup;
}

export const WorkspacePanel = debouncedComponent(InnerWorkspacePanel);

// Exported for testing purposes only.
export function InnerWorkspacePanel({
  activeDatasourceId,
  activeVisualizationId,
  visualizationMap,
  visualizationState,
  datasourceMap,
  datasourceStates,
  framePublicAPI,
  dispatch,
  core,
  ExpressionRenderer: ExpressionRendererComponent,
}: WorkspacePanelProps) {
  const IS_DARK_THEME = core.uiSettings.get('theme:darkMode');
  const emptyStateGraphicURL = IS_DARK_THEME
    ? '/plugins/lens/assets/lens_app_graphic_dark_2x.png'
    : '/plugins/lens/assets/lens_app_graphic_light_2x.png';

  const dragDropContext = useContext(DragContext);

  const suggestionForDraggedField = useMemo(() => {
    if (!dragDropContext.dragging || !activeDatasourceId) {
      return;
    }

    const hasData = Object.values(framePublicAPI.datasourceLayers).some(
      datasource => datasource.getTableSpec().length > 0
    );

    const suggestions = getSuggestions({
      datasourceMap: { [activeDatasourceId]: datasourceMap[activeDatasourceId] },
      datasourceStates,
      visualizationMap:
        hasData && activeVisualizationId
          ? { [activeVisualizationId]: visualizationMap[activeVisualizationId] }
          : visualizationMap,
      activeVisualizationId,
      visualizationState,
      field: dragDropContext.dragging,
    });

    return suggestions.find(s => s.visualizationId === activeVisualizationId) || suggestions[0];
  }, [dragDropContext.dragging]);

  const [expressionError, setExpressionError] = useState<unknown>(undefined);

  const activeVisualization = activeVisualizationId
    ? visualizationMap[activeVisualizationId]
    : null;
  const expression = useMemo(() => {
    try {
      return buildExpression({
        visualization: activeVisualization,
        visualizationState,
        datasourceMap,
        datasourceStates,
        framePublicAPI,
      });
    } catch (e) {
      setExpressionError(e.toString());
    }
  }, [
    activeVisualization,
    visualizationState,
    datasourceMap,
    datasourceStates,
    framePublicAPI.dateRange,
    framePublicAPI.query,
    framePublicAPI.filters,
  ]);

  function onDrop() {
    if (suggestionForDraggedField) {
      trackUiEvent('drop_onto_workspace');
      trackUiEvent(expression ? 'drop_non_empty' : 'drop_empty');
      switchToSuggestion(
        framePublicAPI,
        dispatch,
        suggestionForDraggedField,
        'SWITCH_VISUALIZATION'
      );
    }
  }

  function renderEmptyWorkspace() {
    const tooltipContent = i18n.translate('xpack.lens.editorFrame.tooltipContent', {
      defaultMessage:
        'Lens is in beta and is subject to change.  The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features',
    });
    return (
      <div className="eui-textCenter">
        <EuiText textAlign="center" grow={false} color="subdued" data-test-subj="empty-workspace">
          <h3>
            <FormattedMessage
              id="xpack.lens.editorFrame.emptyWorkspace"
              defaultMessage="Drop some fields here to start"
            />
          </h3>
          <EuiImage
            style={{ width: 360 }}
            url={core.http.basePath.prepend(emptyStateGraphicURL)}
            alt=""
          />
          <p>
            <FormattedMessage
              id="xpack.lens.editorFrame.emptyWorkspaceHeading"
              defaultMessage="Lens is a new tool for creating visualizations"
            />{' '}
            <EuiBetaBadge label="Beta" tooltipContent={tooltipContent} />
          </p>
          <EuiButtonEmpty
            href="https://discuss.elastic.co/c/kibana"
            iconType="popout"
            iconSide="right"
            size="xs"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.lens.editorFrame.goToForums"
              defaultMessage="Make requests and give feedback"
            />
          </EuiButtonEmpty>
        </EuiText>
      </div>
    );
  }

  function renderVisualization() {
    useEffect(() => {
      // reset expression error if component attempts to run it again
      if (expressionError) {
        setExpressionError(undefined);
      }
    }, [expression]);

    if (expression === null) {
      return renderEmptyWorkspace();
    }

    if (expressionError) {
      return (
        <EuiFlexGroup direction="column">
          <EuiFlexItem data-test-subj="expression-failure">
            {/* TODO word this differently because expressions should not be exposed at this level */}
            <FormattedMessage
              id="xpack.lens.editorFrame.expressionFailure"
              defaultMessage="Expression could not be executed successfully"
            />
          </EuiFlexItem>
          {expression && (
            <EuiFlexItem>
              <EuiCodeBlock>{toExpression(expression)}</EuiCodeBlock>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiCodeBlock>{JSON.stringify(expressionError, null, 2)}</EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    } else {
      return (
        <ExpressionRendererComponent
          className="lnsExpressionRenderer"
          expression={expression!}
          onRenderFailure={(e: unknown) => {
            setExpressionError(e);
          }}
        />
      );
    }
  }

  return (
    <DragDrop
      data-test-subj="lnsWorkspace"
      draggable={false}
      droppable={Boolean(suggestionForDraggedField)}
      onDrop={onDrop}
    >
      {renderVisualization()}
    </DragDrop>
  );
}
