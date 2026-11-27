/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import {
  ALERT_DETAILS_FLYOUT_HISTORY_KEY,
  AlertDetailsFrame,
  useAlertDetailsFrame,
} from './alert_details_frame';

const mockEuiFlyout = jest.fn();
const mockEuiFlyoutMount = jest.fn();

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const react = jest.requireActual('react');
  return {
    ...actual,
    EuiFlyout: (props: Record<string, unknown>) => {
      mockEuiFlyout(props);
      react.useEffect(() => mockEuiFlyoutMount(props['data-test-subj']), []);
      return react.createElement(actual.EuiFlyout, props);
    },
  };
});

const flyoutProps = (dataTestSubj: string) =>
  mockEuiFlyout.mock.calls.filter(([props]) => props['data-test-subj'] === dataTestSubj).at(-1)![0];

const Details = ({ title }: { title: string }) => (
  <FlyoutTemplate onClose={jest.fn()}>
    <FlyoutTemplate.Header title={title} />
    <FlyoutTemplate.Body>{`${title} body`}</FlyoutTemplate.Body>
  </FlyoutTemplate>
);

/** Details that open a stacked flyout for their alert, as the full runbook does. */
const DetailsWithStackedFlyout = ({ alertId }: { alertId: string }) => {
  const { openStackedFlyout } = useAlertDetailsFrame();
  return (
    <FlyoutTemplate onClose={jest.fn()}>
      <FlyoutTemplate.Header title={alertId} />
      <FlyoutTemplate.Body>
        <button
          type="button"
          data-test-subj="openStacked"
          onClick={() =>
            openStackedFlyout({
              title: 'Runbook',
              body: `${alertId} runbook`,
              'aria-label': 'Runbook',
              'data-test-subj': 'stacked',
            })
          }
        />
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};

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

    expect(flyoutProps('frame')).toMatchObject({
      type: 'overlay',
      ownFocus: false,
      resizable: true,
      session: 'start',
      historyKey: ALERT_DETAILS_FLYOUT_HISTORY_KEY,
      flyoutMenuProps: { title: 'Alert details', pagination: undefined },
    });
  });

  it('passes the pagination to the flyout menu', () => {
    const pagination = { currentIndex: 1, total: 3, onPrevious: jest.fn(), onNext: jest.fn() };

    render(
      <AlertDetailsFrame onClose={jest.fn()} pagination={pagination} data-test-subj="frame">
        <Details title="First" />
      </AlertDetailsFrame>
    );

    expect(flyoutProps('frame').flyoutMenuProps).toEqual({ title: 'Alert details', pagination });
  });

  it('keeps one flyout mounted while the details inside it change', () => {
    const { rerender } = render(
      <AlertDetailsFrame onClose={jest.fn()} data-test-subj="frame">
        <Details key="first" title="First" />
      </AlertDetailsFrame>
    );
    expect(screen.getByText('First body')).toBeInTheDocument();

    rerender(
      <AlertDetailsFrame onClose={jest.fn()} data-test-subj="frame">
        <Details key="second" title="Second" />
      </AlertDetailsFrame>
    );

    expect(screen.getByText('Second body')).toBeInTheDocument();
    expect(mockEuiFlyoutMount).toHaveBeenCalledTimes(1);
  });

  describe('stacked flyout', () => {
    const renderFrame = (alertId: string) => (
      <AlertDetailsFrame onClose={jest.fn()} data-test-subj="frame">
        <DetailsWithStackedFlyout alertId={alertId} />
      </AlertDetailsFrame>
    );

    it('opens on top of the details in their history group', () => {
      render(renderFrame('a'));

      act(() => screen.getByTestId('openStacked').click());

      expect(screen.getByText('a runbook')).toBeInTheDocument();
      expect(flyoutProps('stacked')).toMatchObject({
        session: 'start',
        historyKey: ALERT_DETAILS_FLYOUT_HISTORY_KEY,
      });
    });

    it('stays open when the details inside the frame are swapped, such as for another alert', () => {
      const { rerender } = render(renderFrame('a'));
      act(() => screen.getByTestId('openStacked').click());

      rerender(
        <AlertDetailsFrame onClose={jest.fn()} data-test-subj="frame">
          <Details title="Other alert" />
        </AlertDetailsFrame>
      );

      expect(screen.getByText('a runbook')).toBeInTheDocument();
    });
  });
});
