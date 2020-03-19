/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
/* eslint-disable @kbn/eslint/module_migration */
import routeData from 'react-router';
/* eslint-enable @kbn/eslint/module_migration */
import { InsertTimelinePopoverComponent } from './';
import { TestProviders } from '../../../mock';
import { ActionCreator } from 'typescript-fsa';
const mockLocation = {
  pathname: '/apath',
  hash: '',
  search: '',
  state: '',
};
const mockLocationWithState = {
  ...mockLocation,
  state: {
    insertTimeline: {
      timelineId: 'timeline-id',
      timelineTitle: 'Timeline title',
    },
  },
};
const onTimelineChange = jest.fn();
const showTimeline = (jest.fn() as unknown) as ActionCreator<{ id: string; show: boolean }>;
const defaultProps = {
  isDisabled: false,
  onTimelineChange,
  showTimeline,
};

describe('Insert timeline popover ', () => {
  /* eslint-disable no-console */
  // Silence until enzyme fixed to use ReactTestUtils.act()
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  /* eslint-enable no-console */
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should insert a timeline when passed in the router state', () => {
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocationWithState);
    mount(
      <TestProviders>
        <InsertTimelinePopoverComponent {...defaultProps} />
      </TestProviders>
    );
    expect(showTimeline).toBeCalledWith({ id: 'timeline-id', show: false });
    expect(onTimelineChange).toBeCalledWith('Timeline title', 'timeline-id');
  });
  it('should do nothing when router state', () => {
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    mount(
      <TestProviders>
        <InsertTimelinePopoverComponent {...defaultProps} />
      </TestProviders>
    );
    expect(showTimeline).toHaveBeenCalledTimes(0);
    expect(onTimelineChange).toHaveBeenCalledTimes(0);
  });
});
