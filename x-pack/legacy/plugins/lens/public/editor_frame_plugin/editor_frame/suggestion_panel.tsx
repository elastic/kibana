/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiIcon,
  EuiTitle,
  EuiPanel,
  EuiIconTip,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { toExpression, Ast } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
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
  previewExpression,
  ExpressionRenderer: ExpressionRendererComponent,
  selected,
  onSelect,
}: {
  onSelect: () => void;
  suggestion: Suggestion;
  ExpressionRenderer: ExpressionRenderer;
  previewExpression?: string;
  selected: boolean;
}) => {
  const [expressionError, setExpressionError] = useState<boolean>(false);

  useEffect(() => {
    setExpressionError(false);
  }, [previewExpression]);

  return (
    <EuiToolTip content={suggestion.title}>
      <EuiPanel
        className={classNames('lnsSuggestionPanel__button', {
          'lnsSuggestionPanel__button-isSelected': selected,
        })}
        paddingSize="none"
        data-test-subj="lnsSuggestion"
        onClick={onSelect}
      >
        {expressionError ? (
          <div className="lnsSidebar__suggestionIcon">
            <EuiIconTip
              size="xl"
              color="danger"
              type="alert"
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
            className={classNames('lnsSuggestionChartWrapper', [
              `lnsSuggestionChartWrapper--${suggestion.previewIcon}`,
            ])}
            expression={previewExpression}
            onRenderFailure={(e: unknown) => {
              // eslint-disable-next-line no-console
              console.error(`Failed to render preview: `, e);
              setExpressionError(true);
            }}
          />
        ) : (
          <span className="lnsSidebar__suggestionIcon">
            <EuiIcon size="xxl" type={suggestion.previewIcon} />
          </span>
        )}
      </EuiPanel>
    </EuiToolTip>
  );
};

// TODO this little debounce value is just here to showcase the feature better,
// will be fixed in suggestion performance PR
export const SuggestionPanel = debouncedComponent(InnerSuggestionPanel, 200);

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

  const [lastSelectedSuggestion, setLastSelectedSuggestion] = useState<number>(-1);

  useEffect(() => {
    // if the staged preview is overwritten by a suggestion,
    // reset the selected index to "current visualization" because
    // we are not in transient suggestion state anymore
    if (!stagedPreview && lastSelectedSuggestion !== -1) {
      setLastSelectedSuggestion(-1);
    }
  }, [stagedPreview]);

  if (!activeDatasourceId) {
    return null;
  }

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
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle className="lnsSuggestionsPanel__title" size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.lens.editorFrame.suggestionPanelTitle"
                defaultMessage="Suggestions"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {stagedPreview && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={() => {
                dispatch({
                  type: 'SUBMIT_SUGGESTION',
                });
              }}
            >
              Confirm and reload suggestions
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <div className="lnsSuggestionsPanel__suggestions">
        <EuiPanel
          className={classNames('lnsSuggestionPanel__button', {
            'lnsSuggestionPanel__button-isSelected': lastSelectedSuggestion === -1,
          })}
          paddingSize="none"
          data-test-subj="lnsSuggestion"
          onClick={() => {
            setLastSelectedSuggestion(-1);
            dispatch({
              type: 'ROLLBACK_SUGGESTION',
            });
          }}
        >
          <div className="lnsSuggestionChartWrapper lnsSuggestionChartWrapper--withLabel">
            &lt;- Render vis here -&gt;
          </div>
          <span className="lnsSuggestionPanel__buttonLabel">Current</span>
        </EuiPanel>

        {suggestions.map((suggestion, index) => {
          return (
            <SuggestionPreview
              suggestion={suggestion}
              ExpressionRenderer={ExpressionRendererComponent}
              previewExpression={
                suggestion.previewExpression
                  ? preparePreviewExpression(
                      suggestion.previewExpression,
                      datasourceMap,
                      datasourceStates,
                      frame,
                      suggestion.datasourceId,
                      suggestion.datasourceState
                    )
                  : undefined
              }
              key={index}
              onSelect={() => {
                setLastSelectedSuggestion(index);
                switchToSuggestion(frame, dispatch, suggestion);
              }}
              selected={index === lastSelectedSuggestion}
            />
          );
        })}
      </div>
    </div>
  );
}

function preparePreviewExpression(
  expression: string | Ast,
  datasourceMap: Record<string, Datasource<unknown, unknown>>,
  datasourceStates: Record<string, { isLoading: boolean; state: unknown }>,
  framePublicAPI: FramePublicAPI,
  suggestionDatasourceId?: string,
  suggestionDatasourceState?: unknown
) {
  const expressionWithDatasource = prependDatasourceExpression(
    expression,
    datasourceMap,
    suggestionDatasourceId
      ? {
          ...datasourceStates,
          [suggestionDatasourceId]: {
            isLoading: false,
            state: suggestionDatasourceState,
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

  return expressionWithDatasource
    ? toExpression(prependKibanaContext(expressionWithDatasource, expressionContext))
    : undefined;
}
