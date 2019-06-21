/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';

import { toExpression } from '@kbn/interpreter/common';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { Action } from './state_management';
import { Datasource, Visualization, DatasourcePublicAPI } from '../../types';
import { DragDrop } from '../../drag_drop';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';
import { buildExpression } from './expression_helpers';

export interface WorkspacePanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  datasourcePublicAPI: DatasourcePublicAPI;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
}

export function WorkspacePanel({
  activeDatasource,
  activeVisualizationId,
  datasourceState,
  visualizationMap,
  visualizationState,
  datasourcePublicAPI,
  dispatch,
  ExpressionRenderer: ExpressionRendererComponent,
}: WorkspacePanelProps) {
  function onDrop(item: unknown) {
    const datasourceSuggestions = activeDatasource.getDatasourceSuggestionsForField(
      datasourceState,
      item
    );

    const suggestions = getSuggestions(
      activeDatasource.getPublicAPI(datasourceState, newState =>
        dispatch({ type: 'UPDATE_DATASOURCE_STATE', newState })
      ),
      datasourceSuggestions,
      visualizationMap,
      activeVisualizationId,
      visualizationState
    );

    if (suggestions.length === 0) {
      // TODO specify and implement behavior in case of no valid suggestions
      return;
    }

    const suggestion = suggestions[0];

    // TODO heuristically present the suggestions in a modal instead of just picking the first one
    dispatch(toSwitchAction(suggestion));
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
    const expression = useMemo(
      () => {
        try {
          return buildExpression(
            activeVisualization,
            visualizationState,
            activeDatasource,
            datasourceState,
            datasourcePublicAPI
          );
        } catch (e) {
          setExpressionError(e.toString());
        }
      },
      [
        activeVisualization,
        visualizationState,
        activeDatasource,
        datasourceState,
        datasourcePublicAPI,
      ]
    );

    useEffect(
      () => {
        // reset expression error if component attempts to run it again
        if (expressionError) {
          setExpressionError(undefined);
        }
      },
      [expression]
    );

    if (expression === null) {
      return renderEmptyWorkspace();
    }

    if (expressionError) {
      return (
        <>
          <p data-test-subj="expression-failure">
            {/* TODO word this differently because expressions should not be exposed at this level */}
            <FormattedMessage
              id="xpack.lens.editorFrame.expressionFailure"
              defaultMessage="Expression could not be executed successfully"
            />
          </p>
          {expression && (
            <>
              <EuiCodeBlock>{toExpression(expression)}</EuiCodeBlock>
              <EuiSpacer />
            </>
          )}
          <EuiCodeBlock>{JSON.stringify(expressionError, null, 2)}</EuiCodeBlock>
        </>
      );
    } else {
      return (
        <ExpressionRendererComponent
          expression={expression!}
          onRenderFailure={(e: unknown) => {
            setExpressionError(e);
          }}
        />
      );
    }
  }

  return (
    <DragDrop draggable={false} droppable={true} onDrop={onDrop}>
      {renderVisualization()}
    </DragDrop>
  );
}
