/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { Action } from './state_management';
import { Datasource, Visualization } from '../../types';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';

export interface SuggestionPanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  dispatch: (action: Action) => void;
}

export function SuggestionPanel({
  activeDatasource,
  datasourceState,
  activeVisualizationId,
  visualizationMap,
  visualizationState,
  dispatch,
}: SuggestionPanelProps) {
  const datasourceSuggestions = activeDatasource.getDatasourceSuggestionsFromCurrentState(
    datasourceState
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

  return (
    <>
      <h2>
        <FormattedMessage
          id="xpack.lens.editorFrame.suggestionPanelTitle"
          defaultMessage="Suggestions"
        />
      </h2>
      {suggestions.map((suggestion, index) => {
        return (
          <button
            key={index}
            data-test-subj="suggestion"
            onClick={() => {
              dispatch(toSwitchAction(suggestion));
            }}
          >
            {suggestion.title}
          </button>
        );
      })}
    </>
  );
}
