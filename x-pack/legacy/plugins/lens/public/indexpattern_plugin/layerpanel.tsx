/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import {
  // @ts-ignore
  EuiHighlight,
  EuiButtonEmpty,
  EuiIconTip,
  EuiPopover,
  EuiSelectable,
  EuiButtonEmptyProps,
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

export interface LayerPanelChooserTriggerProps extends EuiButtonEmptyProps {
  label: string;
}

function LayerPanelChooser({
  indexPatterns,
  layer,
  onChangeIndexPattern,
  trigger,
}: {
  indexPatterns: IndexPatternPrivateState['indexPatterns'];
  layer: IndexPatternLayer;
  onChangeIndexPattern: (newId: string) => void;
  trigger: LayerPanelChooserTriggerProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  // const currentIndexPatternId = layer.indexPatternId;
  const indexPatternList = Object.values(indexPatterns)
    // .filter(indexPattern => indexPattern.id !== layer.indexPatternId)
    .map(indexPattern => ({
      ...indexPattern,
      isTransferable: isLayerTransferable(layer, indexPattern),
    }));

  const createTrigger = function() {
    const { label, ...rest } = trigger;
    return (
      <EuiButtonEmpty
        flush="left"
        className="eui-textTruncate"
        size="s"
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        {...rest}
      >
        {label}
      </EuiButtonEmpty>
    );
  };

  return (
    <>
      <EuiPopover
        button={createTrigger()}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        className="eui-textTruncate"
        anchorClassName="eui-textTruncate"
      >
        <div style={{ minWidth: 200 }}>
          <EuiSelectable
            searchable
            singleSelection="always"
            options={indexPatternList.map(indexPattern => ({
              label: indexPattern.title,
              value: indexPattern,
              checked: indexPattern.id === layer.indexPatternId ? 'on' : undefined,
              prepend:
                indexPattern && indexPattern.isTransferable ? (
                  undefined
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
                ),
            }))}
            onChange={choices => {
              if (choices.length) {
                onChangeIndexPattern(
                  _.find(choices, function(c) {
                    return c.checked === 'on';
                  })!.value!.id
                );
              }
            }}
            searchProps={{
              compressed: true,
            }}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </div>
      </EuiPopover>
    </>
  );
}

export function LayerPanel({ state, setState, layerId }: IndexPatternLayerPanelProps) {
  return (
    <I18nProvider>
      <LayerPanelChooser
        trigger={{
          label: state.indexPatterns[state.layers[layerId].indexPatternId].title,
          'data-test-subj': 'lns_layerIndexPatternLabel',
        }}
        indexPatterns={state.indexPatterns}
        layer={state.layers[layerId]}
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
