/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { DatasourceLayerPanelProps, StateSetter } from '../types';
import { IndexPatternPrivateState } from './indexpattern';
import { updateLayerIndexPattern } from './state_helpers';
import { ChangeIndexPattern } from './change_indexpattern';

export interface IndexPatternLayerPanelProps extends DatasourceLayerPanelProps {
  state: IndexPatternPrivateState;
  setState: StateSetter<IndexPatternPrivateState>;
}
export function LayerPanel({ state, setState, layerId }: IndexPatternLayerPanelProps) {
  return (
    <I18nProvider>
      <ChangeIndexPattern
        data-test-subj="indexPattern-switcher"
        trigger={{
          label: state.indexPatterns[state.layers[layerId].indexPatternId].title,
          'data-test-subj': 'lns_layerIndexPatternLabel',
        }}
        layer={state.layers[layerId]}
        indexPatterns={state.indexPatterns}
        onChangeIndexPattern={newId => {
          setState({
            ...state,
            currentIndexPatternId: newId,
            layers: {
              ...state.layers,
              [layerId]: updateLayerIndexPattern(state.layers[layerId], state.indexPatterns[newId]),
            },
          });
        }}
      />
    </I18nProvider>
  );
}
