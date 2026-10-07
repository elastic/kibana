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

const MEASURED_SUBJS = new Set([IMPACT_PILL_TEST_SUBJ, IMPACT_OVERFLOW_TEST_SUBJ]);

/**
 * jsdom has no layout, so emulate a wrapping row: `perRow` pills per line,
 * hidden (`display: none`) items take no space, each line is 30px tall.
 */
const mockWrappingLayout = (perRow: number) => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      if (!MEASURED_SUBJS.has(this.dataset.testSubj ?? '')) {
        return 0;
      }
      const visibleSiblings = Array.from(this.parentElement?.children ?? []).filter(
        (sibling) => (sibling as HTMLElement).style.display !== 'none'
      );
      return Math.floor(visibleSiblings.indexOf(this) / perRow) * 30;
    },
  });
  return () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', original);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).offsetTop;
    }
  };
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
    let restoreLayout: () => void;

    beforeEach(() => {
      restoreLayout = mockWrappingLayout(3);
    });

    afterEach(() => {
      restoreLayout();
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
