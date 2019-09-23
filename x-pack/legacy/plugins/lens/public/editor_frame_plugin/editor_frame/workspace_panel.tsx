/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { toExpression } from '@kbn/interpreter/common';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/expressions/public';
import { Action } from './state_management';
import { Datasource, Visualization, FramePublicAPI } from '../../types';
import { DragDrop, DragContext } from '../../drag_drop';
import { getSuggestions, switchToSuggestion } from './suggestion_helpers';
import { buildExpression } from './expression_helpers';
import { debouncedComponent } from '../../debounced_component';

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
  ExpressionRenderer: ExpressionRendererComponent,
}: WorkspacePanelProps) {
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

    return suggestions[0];
  }, [dragDropContext.dragging]);

  function onDrop() {
    if (suggestionForDraggedField) {
      switchToSuggestion(
        framePublicAPI,
        dispatch,
        suggestionForDraggedField,
        'SWITCH_VISUALIZATION'
      );
    }
  }

  function renderEmptyWorkspace() {
    return (
      <p data-test-subj="empty-workspace">
        <FormattedMessage
          id="xpack.lens.editorFrame.emptyWorkspace"
          defaultMessage="This is the workspace panel. Drop fields here"
        />
      </p>
    );
  }

  function renderVisualization() {
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
    ]);

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
          className="lnsExpressionOutput"
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
