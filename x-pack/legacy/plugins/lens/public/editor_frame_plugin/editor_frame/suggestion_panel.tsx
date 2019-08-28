/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiTitle, EuiPanel, EuiIconTip, EuiToolTip } from '@elastic/eui';
import { toExpression } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import { Action, PreviewState } from './state_management';
import { Datasource, Visualization, FramePublicAPI } from '../../types';
import { getSuggestions, Suggestion, switchToSuggestion } from './suggestion_helpers';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { prependDatasourceExpression, prependKibanaContext } from './expression_helpers';
import { debouncedComponent } from '../../debounced_component';

const MAX_SUGGESTIONS_DISPLAYED = 5;

export interface SuggestionPanelProps {
  activeDatasourceId: string | null;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
  frame: FramePublicAPI;
  stagedPreview?: PreviewState;
}

const SuggestionPreview = ({
  suggestion,
  dispatch,
  frame,
  previewExpression,
  ExpressionRenderer: ExpressionRendererComponent,
}: {
  suggestion: Suggestion;
  dispatch: (action: Action) => void;
  frame: FramePublicAPI;
  ExpressionRenderer: ExpressionRenderer;
  previewExpression?: string;
}) => {
  const [expressionError, setExpressionError] = useState<boolean>(false);

  useEffect(() => {
    setExpressionError(false);
  }, [previewExpression]);

  return (
    <EuiToolTip content={suggestion.title}>
      <EuiPanel
        className="lnsSuggestionPanel__button"
        paddingSize="none"
        data-test-subj="lnsSuggestion"
        onClick={() => {
          switchToSuggestion(frame, dispatch, suggestion);
        }}
      >
        {expressionError ? (
          <div className="lnsSidebar__suggestionIcon">
            <EuiIconTip
              size="xxl"
              color="danger"
              type="cross"
              aria-label={i18n.translate('xpack.lens.editorFrame.previewErrorLabel', {
                defaultMessage: 'Preview rendering failed',
              })}
              content={i18n.translate('xpack.lens.editorFrame.previewErrorTooltip', {
                defaultMessage: 'Preview rendering failed',
              })}
            />
          </div>
        ) : previewExpression ? (
          <ExpressionRendererComponent
            className="lnsSuggestionChartWrapper"
            expression={previewExpression}
            onRenderFailure={(e: unknown) => {
              // eslint-disable-next-line no-console
              console.error(`Failed to render preview: `, e);
              setExpressionError(true);
            }}
          />
        ) : (
          <div className="lnsSidebar__suggestionIcon">
            <EuiIcon size="xxl" type={suggestion.previewIcon} />
          </div>
        )}
      </EuiPanel>
    </EuiToolTip>
  );
};

export const SuggestionPanel = debouncedComponent(InnerSuggestionPanel, 2000);

function InnerSuggestionPanel({
  activeDatasourceId,
  datasourceMap,
  datasourceStates,
  activeVisualizationId,
  visualizationMap,
  visualizationState,
  dispatch,
  frame,
  ExpressionRenderer: ExpressionRendererComponent,
  stagedPreview,
}: SuggestionPanelProps) {
  if (!activeDatasourceId) {
    return null;
  }
  const stagedSuggestions = useMemo(() => {
    if (!stagedPreview) return;
    return getSuggestions({
      datasourceMap,
      datasourceStates: stagedPreview.datasourceStates,
      visualizationMap,
      activeVisualizationId: stagedPreview.visualization.activeId,
      visualizationState: stagedPreview.visualization.state,
    });
  }, [stagedPreview, datasourceMap, visualizationMap]);

  const suggestions = (
    stagedSuggestions ||
    getSuggestions({
      datasourceMap,
      datasourceStates,
      visualizationMap,
      activeVisualizationId,
      visualizationState,
    })
  )
    .filter(suggestion => !suggestion.hide)
    .slice(0, MAX_SUGGESTIONS_DISPLAYED);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="lnsSuggestionsPanel">
      <EuiTitle className="lnsSuggestionsPanel__title" size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.lens.editorFrame.suggestionPanelTitle"
            defaultMessage="Suggestions"
          />
          {stagedPreview &&
            '(Previewing a suggestion currently, you can go back to your previous state)'}
        </h3>
      </EuiTitle>
      <div className="lnsSuggestionsPanel__suggestions">
        <EuiPanel
          className="lnsSuggestionPanel__button"
          paddingSize="none"
          data-test-subj="lnsSuggestion"
          onClick={() => {
            dispatch({
              type: 'ROLLBACK_SUGGESTION',
            });
          }}
        >
          Current visualization
        </EuiPanel>
        {suggestions.map((suggestion: Suggestion) => {
          const previewExpression = preparePreviewExpression(
            suggestion,
            datasourceMap,
            datasourceStates,
            frame
          );
          return (
            <SuggestionPreview
              suggestion={suggestion}
              dispatch={dispatch}
              frame={frame}
              ExpressionRenderer={ExpressionRendererComponent}
              previewExpression={previewExpression ? toExpression(previewExpression) : undefined}
              key={`${suggestion.visualizationId}-${suggestion.title}`}
            />
          );
        })}
      </div>
    </div>
  );
}
function preparePreviewExpression(
  suggestion: Suggestion,
  datasourceMap: Record<string, Datasource<unknown, unknown>>,
  datasourceStates: Record<string, { isLoading: boolean; state: unknown }>,
  framePublicAPI: FramePublicAPI
) {
  if (!suggestion.previewExpression) return null;

  const expressionWithDatasource = prependDatasourceExpression(
    suggestion.previewExpression,
    datasourceMap,
    suggestion.datasourceId
      ? {
          ...datasourceStates,
          [suggestion.datasourceId]: {
            isLoading: false,
            state: suggestion.datasourceState,
          },
        }
      : datasourceStates
  );

  const expressionContext = {
    query: framePublicAPI.query,
    timeRange: {
      from: framePublicAPI.dateRange.fromDate,
      to: framePublicAPI.dateRange.toDate,
    },
  };

  return prependKibanaContext(expressionWithDatasource, expressionContext);
}
