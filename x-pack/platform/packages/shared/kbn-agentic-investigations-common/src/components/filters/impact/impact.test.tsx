/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../../types';
import {
  Impact,
  IMPACT_COLLAPSE_TEST_SUBJ,
  IMPACT_OVERFLOW_TEST_SUBJ,
  IMPACT_PILL_TEST_SUBJ,
  IMPACT_PILLS_TEST_SUBJ,
} from './impact';

const investigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Case',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  worker_execution_ids: [],
  pendingProposalCount: 1,
  assignees: [],
  events: [],
  ...overrides,
});

const visibleRow = () => within(screen.getByTestId(IMPACT_PILLS_TEST_SUBJ));

const pillLabels = () =>
  visibleRow()
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'));

/** Width jsdom reports for the Impact row; three 100px pills per line at the 320px default. */
let containerWidth = 320;

/**
 * jsdom has no layout, so give the measured elements fixed widths: 100px pills,
 * a 40px `+n` pill and `containerWidth` for the row. With the 8px gap the
 * default is three pills per row.
 */
const mockPillWidths = () =>
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const testSubj = this.getAttribute('data-test-subj');
      const width =
        testSubj === IMPACT_PILL_TEST_SUBJ
          ? 100
          : testSubj === IMPACT_OVERFLOW_TEST_SUBJ
          ? 40
          : containerWidth;
      return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 } as DOMRect;
    });

/**
 * EUI's test build of `useResizeObserver` measures once on mount, so stand in
 * for it to report a later resize the way the browser would.
 */
const mockObservedWidth = { width: 0, height: 0 };
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useResizeObserver: jest.fn(() => mockObservedWidth),
  };
});

/** Reports a new row width and re-renders a fresh element, as the observer would. */
const resizeRowTo = (
  width: number,
  rerender: (ui: React.ReactElement) => void,
  makeUi: () => React.ReactElement
) => {
  containerWidth = width;
  mockObservedWidth.width = width;
  rerender(makeUi());
};

const sevenHosts = Array.from({ length: 7 }, (_, index) =>
  investigation({ id: `inv-${index}`, entityIds: [`host-${index}`] })
);

describe('Impact', () => {
  it('renders nothing when no investigation carries an entity', () => {
    renderWithKibanaRenderContext(
      <Impact items={[investigation()]} entityFilter={null} onEntityFilterChange={jest.fn()} />
    );

    expect(screen.queryByRole('heading', { name: 'Impact' })).not.toBeInTheDocument();
  });

  it('renders deduped pills with counts, busiest entity first', () => {
    renderWithKibanaRenderContext(
      <Impact
        items={[
          investigation({ entityIds: ['zeta'] }),
          investigation({ id: 'inv-2', entityIds: ['alpha', 'zeta'] }),
        ]}
        entityFilter={null}
        onEntityFilterChange={jest.fn()}
      />
    );

    expect(pillLabels()).toEqual(['zeta', 'alpha']);
    expect(visibleRow().getByText('2')).toBeInTheDocument();
    expect(visibleRow().getByText('1')).toBeInTheDocument();
  });

  it('selects a pill and clears it on the second click', () => {
    const onEntityFilterChange = jest.fn();
    const investigations = [investigation({ entityIds: ['host-1'] })];

    const { unmount } = renderWithKibanaRenderContext(
      <Impact
        items={investigations}
        entityFilter={null}
        onEntityFilterChange={onEntityFilterChange}
      />
    );
    fireEvent.click(visibleRow().getByRole('button', { name: 'host-1' }));
    expect(onEntityFilterChange).toHaveBeenCalledWith('host-1');
    unmount();

    renderWithKibanaRenderContext(
      <Impact
        items={investigations}
        entityFilter="host-1"
        onEntityFilterChange={onEntityFilterChange}
      />
    );
    fireEvent.click(visibleRow().getByRole('button', { name: 'host-1' }));
    expect(onEntityFilterChange).toHaveBeenLastCalledWith(null);
  });

  describe('two-row collapse', () => {
    let widthSpy: jest.SpyInstance;

    beforeEach(() => {
      containerWidth = 320;
      mockObservedWidth.width = 320;
      widthSpy = mockPillWidths();
    });

    afterEach(() => {
      widthSpy.mockRestore();
    });

    it('re-cuts the row when the container resizes', () => {
      const makeUi = () => (
        <Impact items={sevenHosts} entityFilter={null} onEntityFilterChange={jest.fn()} />
      );
      const { rerender } = renderWithKibanaRenderContext(makeUi());
      expect(visibleRow().getAllByTestId(IMPACT_PILL_TEST_SUBJ)).toHaveLength(5);

      // Two pills per row: one row of pills, then two pills and "+4".
      resizeRowTo(212, rerender, makeUi);
      expect(pillLabels()).toEqual(['host-0', 'host-1', 'host-2', 'Show 4 more']);

      // Wide enough for everything: the "+n" pill goes away.
      resizeRowTo(1000, rerender, makeUi);
      expect(visibleRow().getAllByTestId(IMPACT_PILL_TEST_SUBJ)).toHaveLength(7);
      expect(visibleRow().queryByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('hides pills past two rows behind a +n pill that counts the hidden ones', () => {
      renderWithKibanaRenderContext(
        <Impact items={sevenHosts} entityFilter={null} onEntityFilterChange={jest.fn()} />
      );

      // 3 per row, 2 rows, one slot reserved for "+n": 5 pills + "+2".
      expect(pillLabels()).toEqual([
        'host-0',
        'host-1',
        'host-2',
        'host-3',
        'host-4',
        'Show 2 more',
      ]);
      expect(visibleRow().getByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).toHaveTextContent('+2');
    });

    it('expands on +n and collapses again from the trailing control', () => {
      renderWithKibanaRenderContext(
        <Impact items={sevenHosts} entityFilter={null} onEntityFilterChange={jest.fn()} />
      );

      fireEvent.click(visibleRow().getByRole('button', { name: 'Show 2 more' }));
      expect(visibleRow().getAllByTestId(IMPACT_PILL_TEST_SUBJ)).toHaveLength(7);
      expect(visibleRow().queryByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).not.toBeInTheDocument();

      fireEvent.click(
        within(visibleRow().getByTestId(IMPACT_COLLAPSE_TEST_SUBJ)).getByRole('button', {
          name: 'Show fewer',
        })
      );
      expect(visibleRow().getAllByTestId(IMPACT_PILL_TEST_SUBJ)).toHaveLength(5);
      expect(visibleRow().getByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).toHaveTextContent('+2');
    });

    it('drops the collapse control when an expanded list shrinks to fit', () => {
      const { rerender } = renderWithKibanaRenderContext(
        <Impact items={sevenHosts} entityFilter={null} onEntityFilterChange={jest.fn()} />
      );
      fireEvent.click(visibleRow().getByRole('button', { name: 'Show 2 more' }));
      expect(visibleRow().getByTestId(IMPACT_COLLAPSE_TEST_SUBJ)).toBeInTheDocument();

      rerender(
        <Impact
          items={sevenHosts.slice(0, 6)}
          entityFilter={null}
          onEntityFilterChange={jest.fn()}
        />
      );
      expect(visibleRow().getAllByTestId(IMPACT_PILL_TEST_SUBJ)).toHaveLength(6);
      expect(visibleRow().queryByTestId(IMPACT_COLLAPSE_TEST_SUBJ)).not.toBeInTheDocument();
      expect(visibleRow().queryByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('shows every pill without a +n when they fit in two rows', () => {
      renderWithKibanaRenderContext(
        <Impact
          items={sevenHosts.slice(0, 6)}
          entityFilter={null}
          onEntityFilterChange={jest.fn()}
        />
      );

      expect(visibleRow().getAllByTestId(IMPACT_PILL_TEST_SUBJ)).toHaveLength(6);
      expect(visibleRow().queryByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('pins a selected pill that would be hidden to the end of the visible row', () => {
      renderWithKibanaRenderContext(
        <Impact items={sevenHosts} entityFilter="host-6" onEntityFilterChange={jest.fn()} />
      );

      // Six slots: 4 leading pills, the selected host-6, then "+2".
      expect(pillLabels()).toEqual([
        'host-0',
        'host-1',
        'host-2',
        'host-3',
        'host-6',
        'Show 2 more',
      ]);
    });

    it('keeps the natural order when the selected pill is already visible', () => {
      renderWithKibanaRenderContext(
        <Impact items={sevenHosts} entityFilter="host-1" onEntityFilterChange={jest.fn()} />
      );

      expect(pillLabels()).toEqual([
        'host-0',
        'host-1',
        'host-2',
        'host-3',
        'host-4',
        'Show 2 more',
      ]);
    });
  });
});
