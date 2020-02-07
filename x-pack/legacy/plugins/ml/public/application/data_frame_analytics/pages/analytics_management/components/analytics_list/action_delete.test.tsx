/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';

import * as CheckPrivilige from '../../../../../privilege/check_privilege';
import { queryByTestSubj } from '../../../../../util/test_utils';

import { DeleteAction } from './action_delete';

import mockAnalyticsListItem from './__mocks__/analytics_list_item.json';

jest.mock('../../../../../privilege/check_privilege', () => ({
  checkPermission: jest.fn(() => false),
  createPermissionFailureMessage: jest.fn(),
}));
jest.mock('ui/new_platform');

describe('DeleteAction', () => {
  test('When canDeleteDataFrameAnalytics permission is false, button should be disabled.', () => {
    const { container } = render(<DeleteAction item={mockAnalyticsListItem} />);
    expect(queryByTestSubj(container, 'mlAnalyticsJobDeleteButton')).toHaveAttribute('disabled');
  });

  test('When canDeleteDataFrameAnalytics permission is true, button should not be disabled.', () => {
    const mock = jest.spyOn(CheckPrivilige, 'checkPermission');
    mock.mockImplementation(p => p === 'canDeleteDataFrameAnalytics');
    const { container } = render(<DeleteAction item={mockAnalyticsListItem} />);

    expect(queryByTestSubj(container, 'mlAnalyticsJobDeleteButton')).not.toHaveAttribute(
      'disabled'
    );

    mock.mockRestore();
  });

  test('When job is running, delete button should be disabled.', () => {
    const { container } = render(
      <DeleteAction
        item={{
          ...mockAnalyticsListItem,
          stats: { state: 'started' },
        }}
      />
    );

    expect(queryByTestSubj(container, 'mlAnalyticsJobDeleteButton')).toHaveAttribute('disabled');
  });
});
