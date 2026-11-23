/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { ALERT_DETAILS_FLYOUT_HISTORY_KEY, AlertDetailsFrame } from './alert_details_frame';

const mockEuiFlyout = jest.fn();
const mockEuiFlyoutMount = jest.fn();

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const react = jest.requireActual('react');
  return {
    ...actual,
    EuiFlyout: (props: Record<string, unknown>) => {
      mockEuiFlyout(props);
      react.useEffect(() => mockEuiFlyoutMount(), []);
      return react.createElement(actual.EuiFlyout, props);
    },
  };
});

const flyoutProps = () => mockEuiFlyout.mock.calls[mockEuiFlyout.mock.calls.length - 1][0];

const Details = ({ title }: { title: string }) => (
  <FlyoutTemplate onClose={jest.fn()}>
    <FlyoutTemplate.Header title={title} />
    <FlyoutTemplate.Body>{`${title} body`}</FlyoutTemplate.Body>
  </FlyoutTemplate>
);

describe('AlertDetailsFrame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a maskless overlay in the alert details history group', () => {
    render(
      <AlertDetailsFrame onClose={jest.fn()} data-test-subj="frame">
        <Details title="First" />
      </AlertDetailsFrame>
    );

    expect(flyoutProps()).toMatchObject({
      type: 'overlay',
      ownFocus: false,
      resizable: true,
      session: 'start',
      historyKey: ALERT_DETAILS_FLYOUT_HISTORY_KEY,
      'data-test-subj': 'frame',
      flyoutMenuProps: { title: 'Alert details', pagination: undefined },
    });
  });

  it('passes the pagination to the flyout menu', () => {
    const pagination = { currentIndex: 1, total: 3, onPrevious: jest.fn(), onNext: jest.fn() };

    render(
      <AlertDetailsFrame onClose={jest.fn()} pagination={pagination}>
        <Details title="First" />
      </AlertDetailsFrame>
    );

    expect(flyoutProps().flyoutMenuProps).toEqual({ title: 'Alert details', pagination });
  });

  it('keeps one flyout mounted while the details inside it change', () => {
    const { rerender } = render(
      <AlertDetailsFrame onClose={jest.fn()}>
        <Details key="first" title="First" />
      </AlertDetailsFrame>
    );
    expect(screen.getByText('First body')).toBeInTheDocument();

    rerender(
      <AlertDetailsFrame onClose={jest.fn()}>
        <Details key="second" title="Second" />
      </AlertDetailsFrame>
    );

    expect(screen.getByText('Second body')).toBeInTheDocument();
    expect(mockEuiFlyoutMount).toHaveBeenCalledTimes(1);
  });
});
