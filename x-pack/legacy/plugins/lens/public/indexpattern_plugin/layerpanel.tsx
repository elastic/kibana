/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import {
  EuiComboBox,
  // @ts-ignore
  EuiHighlight,
  EuiButtonEmpty,
  EuiIcon,
} from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { DatasourceLayerPanelProps } from '../types';
import { IndexPatternPrivateState } from './indexpattern';
import { isLayerTransferable, updateLayerIndexPattern } from './state_helpers';

export interface IndexPatternLayerPanelProps extends DatasourceLayerPanelProps {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
}

export function LayerPanel({ state, setState, layerId }: IndexPatternLayerPanelProps) {
  const [isChooserOpen, setChooserOpen] = useState(false);
  const indexPatterns = Object.values(state.indexPatterns).map(indexPattern => ({
    ...indexPattern,
    isTransferable: isLayerTransferable(state.layers[layerId], indexPattern),
  }));
  const currentIndexPatternId = state.layers[layerId].indexPatternId;

  return (
    <I18nProvider>
      {isChooserOpen ? (
        <EuiComboBox
          data-test-subj="indexPattern-switcher"
          options={indexPatterns.map(indexPattern => ({
            label: indexPattern.title,
            value: indexPattern,
          }))}
          inputRef={el => {
            if (el) {
              el.focus();
            }
          }}
          selectedOptions={[
            {
              label: state.indexPatterns[currentIndexPatternId].title,
              value: state.indexPatterns[currentIndexPatternId].id,
            },
          ]}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          onBlur={() => {
            setChooserOpen(false);
          }}
          onChange={choices => {
            setState({
              ...state,
              layers: {
                ...state.layers,
                [layerId]: updateLayerIndexPattern(state.layers[layerId], choices[0].value!),
              },
            });

            setChooserOpen(false);
          }}
          renderOption={(option, searchValue, contentClassName) => {
            const { label, value } = option;
            return (
              <span className={contentClassName}>
                <EuiIcon type={value && value.isTransferable ? 'empty' : 'bolt'} />
                <EuiHighlight search={searchValue}>{label}</EuiHighlight>
              </span>
            );
          }}
        />
      ) : (
        <EuiButtonEmpty size="s" onClick={() => setChooserOpen(true)}>
          {state.indexPatterns[state.layers[layerId].indexPatternId].title}
        </EuiButtonEmpty>
      )}
    </I18nProvider>
  );
}
