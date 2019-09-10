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
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { DatasourceLayerPanelProps, StateSetter } from '../types';
import { IndexPatternPrivateState, IndexPatternLayer } from './indexpattern';
import { isLayerTransferable, updateLayerIndexPattern } from './state_helpers';

export interface IndexPatternLayerPanelProps extends DatasourceLayerPanelProps {
  state: IndexPatternPrivateState;
  setState: StateSetter<IndexPatternPrivateState>;
}

function LayerPanelChooser({
  indexPatterns,
  layer,
  onChangeIndexPattern,
  onExitChooser,
}: {
  indexPatterns: IndexPatternPrivateState['indexPatterns'];
  layer: IndexPatternLayer;
  onChangeIndexPattern: (newId: string) => void;
  onExitChooser: () => void;
}) {
  const currentIndexPatternId = layer.indexPatternId;
  const indexPatternList = Object.values(indexPatterns)
    .filter(indexPattern => indexPattern.id !== layer.indexPatternId)
    .map(indexPattern => ({
      ...indexPattern,
      isTransferable: isLayerTransferable(layer, indexPattern),
    }));
  return (
    <EuiComboBox
      fullWidth
      data-test-subj="lns_layerIndexPatternSwitcher"
      options={indexPatternList.map(indexPattern => ({
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
          label: indexPatterns[currentIndexPatternId].title,
          value: indexPatterns[currentIndexPatternId].id,
        },
      ]}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      onBlur={onExitChooser}
      onChange={choices => {
        onChangeIndexPattern(choices[0].value!.id);
      }}
      renderOption={(option, searchValue, contentClassName) => {
        const { label, value } = option;
        return (
          <span className={contentClassName}>
            {value && value.isTransferable ? (
              <EuiIcon type="empty" />
            ) : (
              <EuiIconTip
                type="minusInCircle"
                content={i18n.translate(
                  'xpack.lens.indexPattern.lossyIndexPatternSwitchDescription',
                  {
                    defaultMessage:
                      'Not all operations are compatible with this index pattern and will be removed on switching.',
                  }
                )}
              />
            )}
            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
          </span>
        );
      }}
    />
  );
}

export function LayerPanel({ state, setState, layerId }: IndexPatternLayerPanelProps) {
  const [isChooserOpen, setChooserOpen] = useState(false);

  return (
    <I18nProvider>
      <EuiFlexGroup justifyContent="flexEnd">
        {isChooserOpen ? (
          <EuiFlexItem>
            <LayerPanelChooser
              indexPatterns={state.indexPatterns}
              layer={state.layers[layerId]}
              onExitChooser={() => {
                setChooserOpen(false);
              }}
              onChangeIndexPattern={newId => {
                setState({
                  ...state,
                  currentIndexPatternId: newId,
                  layers: {
                    ...state.layers,
                    [layerId]: updateLayerIndexPattern(
                      state.layers[layerId],
                      state.indexPatterns[newId]
                    ),
                  },
                });

                setChooserOpen(false);
              }}
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={null}>
            <EuiButtonEmpty
              size="s"
              onClick={() => setChooserOpen(true)}
              data-test-subj="lns_layerIndexPatternLabel"
            >
              {state.indexPatterns[state.layers[layerId].indexPatternId].title}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </I18nProvider>
  );
}
