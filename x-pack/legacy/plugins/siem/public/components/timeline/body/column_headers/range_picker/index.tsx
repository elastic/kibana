/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { OnRangeSelected } from '../../../events';

import { Ranges } from './ranges';

interface Props {
  selected: string;
  onRangeSelected: OnRangeSelected;
}

export const rangePickerWidth = 120;

// TODO: Upgrade Eui library and use EuiSuperSelect
const SelectContainer = styled.div`
  cursor: pointer;
  width: ${rangePickerWidth}px;
`;

SelectContainer.displayName = 'SelectContainer';

/** Renders a time range picker for the MiniMap (e.g. 1 Day, 1 Week...) */
export const RangePicker = React.memo<Props>(({ selected, onRangeSelected }) => {
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    onRangeSelected(event.target.value);
  };

  return (
    <SelectContainer>
      <EuiSelect
        data-test-subj="rangePicker"
        value={selected}
        options={Ranges.map(range => ({
          text: range,
        }))}
        onChange={onChange}
      />
    </SelectContainer>
  );
});

RangePicker.displayName = 'RangePicker';
