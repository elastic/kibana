/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiSelectable, EuiButtonEmptyProps } from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { IndexPatternRef } from './types';

export interface ChangeIndexPatternTriggerProps extends EuiButtonEmptyProps {
  label: string;
}

export function ChangeIndexPattern({
  indexPatternRefs,
  indexPatternId,
  onChangeIndexPattern,
  trigger,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  onChangeIndexPattern: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

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
        <div style={{ width: 320 }}>
          <EuiSelectable
            {...selectableProps}
            searchable
            singleSelection="always"
            options={indexPatternRefs.map(({ title, id }) => ({
              label: title,
              value: id,
              checked: id === indexPatternId ? 'on' : undefined,
            }))}
            onChange={choices => {
              const choice = (choices.find(({ checked }) => checked) as unknown) as {
                value: string;
              };
              onChangeIndexPattern(choice.value);
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
