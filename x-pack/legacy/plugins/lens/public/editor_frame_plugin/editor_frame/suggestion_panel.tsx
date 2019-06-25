/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiIcon, EuiTitle, EuiPanel } from '@elastic/eui';
import { Action } from './state_management';
import { Datasource, Visualization } from '../../types';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { prependDatasourceExpression } from './expression_helpers';

export interface SuggestionPanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ExpressionRenderer;
}

export function SuggestionPanel({
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
          <EuiPanel
            paddingSize="s"
            key={index}
            data-test-subj="suggestion"
            onClick={() => {
              dispatch(toSwitchAction(suggestion));
            }}
          >
            <EuiTitle size="xxxs">
              <h4>{suggestion.title}</h4>
            </EuiTitle>
            {previewExpression ? (
              <ExpressionRendererComponent
                className="lnsSuggestionChartWrapper"
                expression={previewExpression}
                onRenderFailure={(e: unknown) => {
                  // TODO error handling
                }}
              />
            ) : (
              <div className="lnsSidebar__suggestionIcon">
                <EuiIcon size="xxl" color="subdued " type={suggestion.previewIcon} />
              </div>
            )}
          </EuiPanel>
        );
      })}
    </div>
  );
}
