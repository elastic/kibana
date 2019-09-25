/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiIconTip,
  EuiPopover,
  EuiSelectable,
  EuiButtonEmptyProps,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { i18n } from '@kbn/i18n';
import { IndexPatternPrivateState, IndexPatternLayer } from './indexpattern';
import { isLayerTransferable } from './state_helpers';

export interface ChangeIndexPatternTriggerProps extends EuiButtonEmptyProps {
  label: string;
}

export function ChangeIndexPattern({
  indexPatterns,
  currentIndexPatternId,
  onChangeIndexPattern,
  trigger,
  layer,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatterns: IndexPatternPrivateState['indexPatterns'];
  onChangeIndexPattern: (newId: string) => void;
  currentIndexPatternId?: string;
  layer?: IndexPatternLayer;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [selectedID, setSelectedID] = useState(
    layer ? layer.indexPatternId : currentIndexPatternId
  );

  const indexPatternList = Object.values(indexPatterns).map(indexPattern => ({
    ...indexPattern,
    isTransferable: layer ? isLayerTransferable(layer, indexPattern) : undefined,
  }));

  const createTrigger = function() {
    const { label, ...rest } = trigger;
    return (
      <EuiButtonEmpty
        flush="left"
        className="eui-textTruncate"
        size="xs"
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
        display="block"
        panelPaddingSize="s"
        ownFocus
      >
        <div style={{ minWidth: 300 }}>
          <EuiSelectable
            {...selectableProps}
            searchable
            singleSelection="always"
            options={indexPatternList.map(indexPattern => ({
              id: indexPattern.id,
              label: indexPattern.title,
              checked: indexPattern.id === selectedID ? 'on' : undefined,
              append:
                indexPattern && indexPattern.isTransferable !== false ? (
                  undefined
                ) : (
                  <EuiIconTip
                    color="warning"
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
              // @ts-ignore
              const newSelectedID = choices.find(({ checked }) => checked)!.id;
              onChangeIndexPattern(newSelectedID);
              setSelectedID(newSelectedID);
              setPopoverIsOpen(false);
            }}
            searchProps={{
              compressed: true,
              ...(selectableProps ? selectableProps.searchProps : undefined),
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
