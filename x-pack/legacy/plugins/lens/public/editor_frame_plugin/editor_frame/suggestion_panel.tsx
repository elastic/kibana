/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiTitle, EuiPanel, EuiIconTip } from '@elastic/eui';
import { toExpression } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import { Action } from './state_management';
import { Datasource, Visualization } from '../../types';
import { getSuggestions, toSwitchAction, Suggestion } from './suggestion_helpers';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { prependDatasourceExpression } from './expression_helpers';
import { debouncedComponent } from '../../debounced_component';

export interface SuggestionPanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
}

const SuggestionPreview = ({
  suggestion,
  dispatch,
  previewExpression,
  ExpressionRenderer: ExpressionRendererComponent,
}: {
  suggestion: Suggestion;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
  previewExpression?: string;
}) => {
  const [expressionError, setExpressionError] = useState<boolean>(false);

  useEffect(() => {
    setExpressionError(false);
  }, [previewExpression]);

  return (
    <EuiPanel
      paddingSize="s"
      data-test-subj="suggestion"
      onClick={() => {
        dispatch(toSwitchAction(suggestion));
      }}
    >
      <EuiTitle size="xxxs">
        <h4 data-test-subj="suggestion-title">{suggestion.title}</h4>
      </EuiTitle>
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
          <EuiIcon size="xxl" color="subdued " type={suggestion.previewIcon} />
        </div>
      )}
    </EuiPanel>
  );
};

export const SuggestionPanel = debouncedComponent(InnerSuggestionPanel, 2000);

function InnerSuggestionPanel({
  activeDatasource,
  datasourceState,
  activeVisualizationId,
  visualizationMap,
  visualizationState,
  dispatch,
  ExpressionRenderer: ExpressionRendererComponent,
}: SuggestionPanelProps) {
  const datasourceSuggestions = activeDatasource.getDatasourceSuggestionsFromCurrentState(
    datasourceState
  );

  const suggestions = getSuggestions(
    datasourceSuggestions,
    visualizationMap,
    activeVisualizationId,
    visualizationState
  );

  return (
    <div className="lnsSidebar__suggestions">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.lens.editorFrame.suggestionPanelTitle"
            defaultMessage="Suggestions"
          />
        </h3>
      </EuiTitle>
      {suggestions.map((suggestion, index) => {
        const previewExpression = suggestion.previewExpression
          ? prependDatasourceExpression(
              suggestion.previewExpression,
              activeDatasource,
              suggestion.datasourceState
            )
          : null;
        return (
          <SuggestionPreview
            suggestion={suggestion}
            dispatch={dispatch}
            ExpressionRenderer={ExpressionRendererComponent}
            previewExpression={previewExpression ? toExpression(previewExpression) : undefined}
            key={`${suggestion.visualizationId}-${suggestion.title}`}
          />
        );
      })}
    </div>
  );
}
