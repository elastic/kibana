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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { DatasourceLayerPanelProps } from '../types';
import { IndexPatternLayer, IndexPatternRef, IndexPatternPrivateState } from './types';

export interface IndexPatternLayerPanelProps extends DatasourceLayerPanelProps {
  state: IndexPatternPrivateState;
  onChangeIndexPattern: (newId: string) => Promise<void>;
}

function LayerPanelChooser({
  indexPatternRefs,
  layer,
  onChangeIndexPattern,
  onExitChooser,
}: {
  indexPatternRefs: IndexPatternRef[];
  layer: IndexPatternLayer;
  onChangeIndexPattern: (newId: string) => Promise<void>;
  onExitChooser: () => void;
}) {
  const [indexPatternList, [currentRef]] = _.partition(
    indexPatternRefs,
    p => p.id !== layer.indexPatternId
  );

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
          label: currentRef.title,
          value: currentRef.id,
        },
      ]}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      onBlur={onExitChooser}
      onChange={choices => onChangeIndexPattern(choices[0].value!.id)}
      renderOption={(option, searchValue, contentClassName) => {
        const { label } = option;
        return (
          <span className={contentClassName}>
            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
          </span>
        );
      }}
    />
  );
}

export function LayerPanel({ state, layerId, onChangeIndexPattern }: IndexPatternLayerPanelProps) {
  const [isChooserOpen, setChooserOpen] = useState(false);

  return (
    <I18nProvider>
      <EuiFlexGroup justifyContent="flexEnd">
        {isChooserOpen ? (
          <EuiFlexItem>
            <LayerPanelChooser
              indexPatternRefs={state.indexPatternRefs}
              layer={state.layers[layerId]}
              onExitChooser={() => {
                setChooserOpen(false);
              }}
              onChangeIndexPattern={newId =>
                onChangeIndexPattern(newId).then(() => setChooserOpen(false))
              }
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
