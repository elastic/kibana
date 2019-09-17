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
import { IndexPatternPrivateState, IndexPatternLayer } from './indexpattern';

export interface IndexPatternLayerPanelProps {
  state: IndexPatternPrivateState;
  layerId: string;
  setLayerIndexPattern: (opts: { id: string; layerId: string }) => void;
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
  const currentIndexPattern = indexPatterns[currentIndexPatternId];
  const indexPatternList = Object.values(indexPatterns).filter(
    indexPattern => indexPattern.id !== layer.indexPatternId
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
          label: currentIndexPattern.title,
          value: currentIndexPattern.id,
        },
      ]}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      onBlur={onExitChooser}
      onChange={choices => {
        onChangeIndexPattern(choices[0].value!.id);
      }}
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

export function LayerPanel({ state, setLayerIndexPattern, layerId }: IndexPatternLayerPanelProps) {
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
              onChangeIndexPattern={id => {
                setLayerIndexPattern({ id, layerId });
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
              {state.indexPatterns[state.layers[layerId].indexPatternId]!.title}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </I18nProvider>
  );
}
