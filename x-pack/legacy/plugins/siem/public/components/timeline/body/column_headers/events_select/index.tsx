/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox, EuiSuperSelect } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import { getEventsSelectOptions } from './helpers';

export type CheckState = 'checked' | 'indeterminate' | 'unchecked';
export const EVENTS_SELECT_WIDTH = 60; // px

// SIDE EFFECT: the following `createGlobalStyle` overrides
// the style of the select items
const EventsSelectGlobalStyle = createGlobalStyle`
  .eventsSelectItem {
    width: 100% !important;

    .euiContextMenu__icon {
      display: none !important;
    }
  }

  .eventsSelectDropdown {
    width: ${EVENTS_SELECT_WIDTH}px;
  }
`;

const CheckboxContainer = styled.div`
  position: relative;
`;

CheckboxContainer.displayName = 'CheckboxContainer';

const PositionedCheckbox = styled.div`
  left: 7px;
  position: absolute;
  top: -28px;
`;

PositionedCheckbox.displayName = 'PositionedCheckbox';

interface Props {
  checkState: CheckState;
  timelineId: string;
}

export const EventsSelect = React.memo<Props>(({ checkState, timelineId }) => {
  return (
    <div data-test-subj="events-select">
      <EuiSuperSelect
        className="eventsSelectDropdown"
        data-test-subj="events-select-dropdown"
        itemClassName="eventsSelectItem"
        onChange={noop}
        options={getEventsSelectOptions()}
      />
      <CheckboxContainer data-test-subj="timeline-events-select-checkbox-container">
        <PositionedCheckbox data-test-subj="timeline-events-select-positioned-checkbox">
          <EuiCheckbox
            checked={checkState === 'checked'}
            data-test-subj="events-select-checkbox"
            disabled
            id={`timeline-${timelineId}-events-select`}
            indeterminate={checkState === 'indeterminate'}
            onChange={noop}
          />
        </PositionedCheckbox>
      </CheckboxContainer>
      <EventsSelectGlobalStyle />
    </div>
  );
});

EventsSelect.displayName = 'EventsSelect';
