/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiTitle, EuiPanel, EuiIconTip, EuiToolTip } from '@elastic/eui';
import { toExpression } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import { Datasource, Visualization, FramePublicAPI, SetState } from '../../types';
import { getSuggestions, Suggestion, switchToSuggestion } from './suggestion_helpers';
import { ExpressionRenderer } from '../../../../../../../src/legacy/core_plugins/data/public';
import { debouncedComponent } from '../../debounced_component';
import { prependDatasourceExpression } from '../../state_management';

const MAX_SUGGESTIONS_DISPLAYED = 3;

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
  setState: SetState;
  ExpressionRenderer: ExpressionRenderer;
  frame: FramePublicAPI;
}

const SuggestionPreview = ({
  suggestion,
  setState,
  frame,
  previewExpression,
  ExpressionRenderer: ExpressionRendererComponent,
}: {
  suggestion: Suggestion;
  setState: SetState;
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
        onClick={() => switchToSuggestion(frame, setState, suggestion)}
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
  setState,
  frame,
  ExpressionRenderer: ExpressionRendererComponent,
}: SuggestionPanelProps) {
  if (!activeDatasourceId) {
    return null;
  }

  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualizationId,
    visualizationState,
  }).slice(0, MAX_SUGGESTIONS_DISPLAYED);

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
        </h3>
      </EuiTitle>
      <div className="lnsSuggestionsPanel__suggestions">
        {suggestions.map(suggestion => {
          const previewExpression = suggestion.previewExpression
            ? prependDatasourceExpression(
                suggestion.previewExpression,
                datasourceMap,
                datasourceStates
              )
            : null;
          return (
            <SuggestionPreview
              suggestion={suggestion}
              setState={setState}
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
