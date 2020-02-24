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
import { IconType } from '@elastic/eui/src/components/icon/icon';
import { Ast, toExpression } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { Action, PreviewState } from './state_management';
import { Datasource, Visualization, FramePublicAPI, DatasourcePublicAPI } from '../../types';
import { getSuggestions, switchToSuggestion } from './suggestion_helpers';
import { ReactExpressionRendererType } from '../../../../../../../src/plugins/expressions/public';
import { prependDatasourceExpression, prependKibanaContext } from './expression_helpers';
import { debouncedComponent } from '../../debounced_component';
import { trackUiEvent, trackSuggestionEvent } from '../../lens_ui_telemetry';

const MAX_SUGGESTIONS_DISPLAYED = 5;

// TODO: Remove this <any> when upstream fix is merged https://github.com/elastic/eui/issues/2329
// eslint-disable-next-line
const EuiPanelFixed = EuiPanel as React.ComponentType<any>;

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
  ExpressionRenderer: ReactExpressionRendererType;
  frame: FramePublicAPI;
  stagedPreview?: PreviewState;
}

const PreviewRenderer = ({
  withLabel,
  ExpressionRendererComponent,
  expression,
}: {
  withLabel: boolean;
  expression: string;
  ExpressionRendererComponent: ReactExpressionRendererType;
}) => {
  return (
    <div
      className={classNames('lnsSuggestionPanel__chartWrapper', {
        'lnsSuggestionPanel__chartWrapper--withLabel': withLabel,
      })}
    >
      <ExpressionRendererComponent
        className="lnsSuggestionPanel__expressionRenderer"
        padding="s"
        expression={expression}
        renderError={() => {
          return (
            <div className="lnsSuggestionPanel__suggestionIcon">
              <EuiIconTip
                size="xl"
                color="danger"
                type="alert"
                aria-label={i18n.translate('xpack.lens.editorFrame.previewErrorLabel', {
                  defaultMessage: 'Preview rendering failed',
                })}
                content={i18n.translate('xpack.lens.editorFrame.previewErrorLabel', {
                  defaultMessage: 'Preview rendering failed',
                })}
              />
            </div>
          );
        }}
      />
    </div>
  );
};

const DebouncedPreviewRenderer = debouncedComponent(PreviewRenderer, 2000);

const SuggestionPreview = ({
  preview,
  ExpressionRenderer: ExpressionRendererComponent,
  selected,
  onSelect,
  showTitleAsLabel,
}: {
  onSelect: () => void;
  preview: {
    expression?: Ast;
    icon: IconType;
    title: string;
  };
  ExpressionRenderer: ReactExpressionRendererType;
  selected: boolean;
  showTitleAsLabel?: boolean;
}) => {
  return (
    <EuiToolTip content={preview.title}>
      <EuiPanelFixed
        className={classNames('lnsSuggestionPanel__button', {
          'lnsSuggestionPanel__button-isSelected': selected,
        })}
        paddingSize="none"
        data-test-subj="lnsSuggestion"
        onClick={onSelect}
      >
        {preview.expression ? (
          <DebouncedPreviewRenderer
            ExpressionRendererComponent={ExpressionRendererComponent}
            expression={toExpression(preview.expression)}
            withLabel={Boolean(showTitleAsLabel)}
          />
        ) : (
          <span className="lnsSuggestionPanel__suggestionIcon">
            <EuiIcon size="xxl" type={preview.icon} />
          </span>
        )}
        {showTitleAsLabel && (
          <span className="lnsSuggestionPanel__buttonLabel">{preview.title}</span>
        )}
      </EuiPanelFixed>
    </EuiToolTip>
  );
};

export function SuggestionPanel({
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
  const currentDatasourceStates = stagedPreview ? stagedPreview.datasourceStates : datasourceStates;
  const currentVisualizationState = stagedPreview
    ? stagedPreview.visualization.state
    : visualizationState;
  const currentVisualizationId = stagedPreview
    ? stagedPreview.visualization.activeId
    : activeVisualizationId;

  const { suggestions, currentStateExpression } = useMemo(() => {
    const newSuggestions = getSuggestions({
      datasourceMap,
      datasourceStates: currentDatasourceStates,
      visualizationMap,
      activeVisualizationId: currentVisualizationId,
      visualizationState: currentVisualizationState,
    })
      .map(suggestion => ({
        ...suggestion,
        previewExpression: preparePreviewExpression(
          suggestion,
          visualizationMap[suggestion.visualizationId],
          datasourceMap,
          currentDatasourceStates,
          frame
        ),
      }))
      .filter(suggestion => !suggestion.hide)
      .slice(0, MAX_SUGGESTIONS_DISPLAYED);

    const newStateExpression =
      currentVisualizationState && currentVisualizationId
        ? preparePreviewExpression(
            { visualizationState: currentVisualizationState },
            visualizationMap[currentVisualizationId],
            datasourceMap,
            currentDatasourceStates,
            frame
          )
        : undefined;

    return { suggestions: newSuggestions, currentStateExpression: newStateExpression };
  }, [
    currentDatasourceStates,
    currentVisualizationState,
    currentVisualizationId,
    datasourceMap,
    visualizationMap,
  ]);

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

  if (suggestions.length === 0) {
    return null;
  }

  function rollbackToCurrentVisualization() {
    if (lastSelectedSuggestion !== -1) {
      trackSuggestionEvent('back_to_current');
      setLastSelectedSuggestion(-1);
      dispatch({
        type: 'ROLLBACK_SUGGESTION',
      });
    }
  }

  const expressionContext = {
    query: frame.query,
    timeRange: {
      from: frame.dateRange.fromDate,
      to: frame.dateRange.toDate,
    },
  };

  return (
    <div className="lnsSuggestionPanel">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle className="lnsSuggestionPanel__title" size="xxs">
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
            <EuiToolTip
              content={i18n.translate('xpack.lens.suggestion.refreshSuggestionTooltip', {
                defaultMessage: 'Refresh the suggestions based on the selected visualization.',
              })}
            >
              <EuiButtonEmpty
                data-test-subj="lensSubmitSuggestion"
                size="xs"
                iconType="refresh"
                onClick={() => {
                  trackUiEvent('suggestion_confirmed');
                  dispatch({
                    type: 'SUBMIT_SUGGESTION',
                  });
                }}
              >
                {i18n.translate('xpack.lens.sugegstion.refreshSuggestionLabel', {
                  defaultMessage: 'Refresh',
                })}
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <div className="lnsSuggestionPanel__suggestions">
        {currentVisualizationId && (
          <SuggestionPreview
            preview={{
              expression: currentStateExpression
                ? prependKibanaContext(currentStateExpression, expressionContext)
                : undefined,
              icon:
                visualizationMap[currentVisualizationId].getDescription(currentVisualizationState)
                  .icon || 'empty',
              title: i18n.translate('xpack.lens.suggestions.currentVisLabel', {
                defaultMessage: 'Current',
              }),
            }}
            ExpressionRenderer={ExpressionRendererComponent}
            onSelect={rollbackToCurrentVisualization}
            selected={lastSelectedSuggestion === -1}
            showTitleAsLabel
          />
        )}
        {suggestions.map((suggestion, index) => {
          return (
            <SuggestionPreview
              preview={{
                expression: suggestion.previewExpression
                  ? prependKibanaContext(suggestion.previewExpression, expressionContext)
                  : undefined,
                icon: suggestion.previewIcon,
                title: suggestion.title,
              }}
              ExpressionRenderer={ExpressionRendererComponent}
              key={index}
              onSelect={() => {
                trackUiEvent('suggestion_clicked');
                if (lastSelectedSuggestion === index) {
                  rollbackToCurrentVisualization();
                } else {
                  trackSuggestionEvent(`position_${index}_of_${suggestions.length}`);
                  setLastSelectedSuggestion(index);
                  switchToSuggestion(dispatch, suggestion);
                }
              }}
              selected={index === lastSelectedSuggestion}
            />
          );
        })}
      </div>
    </div>
  );
}

interface VisualizableState {
  visualizationState: unknown;
  datasourceState?: unknown;
  datasourceId?: string;
  keptLayerIds?: string[];
}

function getPreviewExpression(
  visualizableState: VisualizableState,
  visualization: Visualization,
  datasources: Record<string, Datasource>,
  frame: FramePublicAPI
) {
  if (!visualization.toPreviewExpression) {
    return null;
  }

  const suggestionFrameApi: FramePublicAPI = {
    ...frame,
    datasourceLayers: { ...frame.datasourceLayers },
  };

  // use current frame api and patch apis for changed datasource layers
  if (
    visualizableState.keptLayerIds &&
    visualizableState.datasourceId &&
    visualizableState.datasourceState
  ) {
    const datasource = datasources[visualizableState.datasourceId];
    const datasourceState = visualizableState.datasourceState;
    const updatedLayerApis: Record<string, DatasourcePublicAPI> = _.pick(
      frame.datasourceLayers,
      visualizableState.keptLayerIds
    );
    const changedLayers = datasource.getLayers(visualizableState.datasourceState);
    changedLayers.forEach(layerId => {
      if (updatedLayerApis[layerId]) {
        updatedLayerApis[layerId] = datasource.getPublicAPI({
          layerId,
          dateRange: frame.dateRange,
          state: datasourceState,
          setState: () => {},
        });
      }
    });
  }

  return visualization.toPreviewExpression(
    visualizableState.visualizationState,
    suggestionFrameApi
  );
}

function preparePreviewExpression(
  visualizableState: VisualizableState,
  visualization: Visualization,
  datasourceMap: Record<string, Datasource<unknown, unknown>>,
  datasourceStates: Record<string, { isLoading: boolean; state: unknown }>,
  framePublicAPI: FramePublicAPI
) {
  const suggestionDatasourceId = visualizableState.datasourceId;
  const suggestionDatasourceState = visualizableState.datasourceState;

  const expression = getPreviewExpression(
    visualizableState,
    visualization,
    datasourceMap,
    framePublicAPI
  );

  if (!expression) {
    return;
  }

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

  return expressionWithDatasource;
}
