/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Pin } from '../../../../pin';

import * as i18n from './translations';

const InputDisplay = styled.div`
  width: 5px;
`;

InputDisplay.displayName = 'InputDisplay';

const PinIconContainer = styled.div`
  margin-right: 5px;
`;

PinIconContainer.displayName = 'PinIconContainer';

const PinActionItem = styled.div`
  display: flex;
  flex-direction: row;
`;

PinActionItem.displayName = 'PinActionItem';

export type EventsSelectAction =
  | 'select-all'
  | 'select-none'
  | 'select-pinned'
  | 'select-unpinned'
  | 'pin-selected'
  | 'unpin-selected';

export interface EventsSelectOption {
  value: EventsSelectAction;
  inputDisplay: JSX.Element | string;
  disabled?: boolean;
  dropdownDisplay: JSX.Element | string;
}

export const DropdownDisplay = React.memo<{ text: string }>(({ text }) => (
  <EuiText size="s" color="subdued">
    {text}
  </EuiText>
));

DropdownDisplay.displayName = 'DropdownDisplay';

export const getEventsSelectOptions = (): EventsSelectOption[] => [
  {
    inputDisplay: <InputDisplay />,
    disabled: true,
    dropdownDisplay: <DropdownDisplay text={i18n.SELECT_ALL} />,
    value: 'select-all',
  },
  {
    inputDisplay: <InputDisplay />,
    disabled: true,
    dropdownDisplay: <DropdownDisplay text={i18n.SELECT_NONE} />,
    value: 'select-none',
  },
  {
    inputDisplay: <InputDisplay />,
    disabled: true,
    dropdownDisplay: <DropdownDisplay text={i18n.SELECT_PINNED} />,
    value: 'select-pinned',
  },
  {
    inputDisplay: <InputDisplay />,
    disabled: true,
    dropdownDisplay: <DropdownDisplay text={i18n.SELECT_UNPINNED} />,
    value: 'select-unpinned',
  },
  {
    inputDisplay: <InputDisplay />,
    disabled: true,
    dropdownDisplay: (
      <PinActionItem>
        <PinIconContainer>
          <Pin allowUnpinning={true} pinned={true} />
        </PinIconContainer>
        <DropdownDisplay text={i18n.PIN_SELECTED} />
      </PinActionItem>
    ),
    value: 'pin-selected',
  },
  {
    inputDisplay: <InputDisplay />,
    disabled: true,
    dropdownDisplay: (
      <PinActionItem>
        <PinIconContainer>
          <Pin allowUnpinning={true} pinned={false} />
        </PinIconContainer>
        <DropdownDisplay text={i18n.UNPIN_SELECTED} />
      </PinActionItem>
    ),
    value: 'unpin-selected',
  },
];
