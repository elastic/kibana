/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import {
  Impact,
  IMPACT_COLLAPSE_TEST_SUBJ,
  IMPACT_OVERFLOW_TEST_SUBJ,
  IMPACT_PILLS_TEST_SUBJ,
} from './impact';
import type { ImpactPill, PagedImpactPills } from './impact_pills';

const visibleRow = () => within(screen.getByTestId(IMPACT_PILLS_TEST_SUBJ));

const pillLabels = () =>
  visibleRow()
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'));

const paged = (
  pills: ImpactPill[],
  overrides: Partial<PagedImpactPills> = {}
): PagedImpactPills => ({
  pills,
  total: pills.length,
  remaining: 0,
  canShowMore: true,
  reachLimit: 10_000,
  loadFailed: false,
  isLoadingMore: false,
  showMore: jest.fn(),
  ...overrides,
});

const renderImpact = ({
  impact,
  entityFilter = null,
  selectedPill = null,
  onEntityFilterChange = jest.fn(),
}: {
  impact: PagedImpactPills;
  entityFilter?: string | null;
  selectedPill?: ImpactPill | null;
  onEntityFilterChange?: jest.Mock;
}) =>
  renderWithKibanaRenderContext(
    <Impact
      impact={impact}
      entityFilter={entityFilter}
      selectedPill={selectedPill}
      onEntityFilterChange={onEntityFilterChange}
    />
  );

describe('Impact', () => {
  it('renders nothing when there are no pills', () => {
    renderImpact({ impact: paged([]) });

    expect(screen.queryByRole('heading', { name: 'Impact' })).not.toBeInTheDocument();
  });

  it('renders the pills it is given, in order, with their counts', () => {
    renderImpact({
      impact: paged([
        { entityId: 'zeta', count: 2 },
        { entityId: 'alpha', count: 1 },
      ]),
    });

    expect(pillLabels()).toEqual(['zeta', 'alpha']);
    expect(visibleRow().getByText('2')).toBeInTheDocument();
    expect(visibleRow().getByText('1')).toBeInTheDocument();
  });

  it('labels a pill with the entity name and still filters by its id', () => {
    const onEntityFilterChange = jest.fn();
    renderImpact({
      impact: paged([
        { entityId: 'host:572750b8', name: 'SRVWIN01', entityType: 'host', count: 2 },
        { entityId: 'user:it.admin@572750b8@local', count: 1 },
      ]),
      onEntityFilterChange,
    });

    expect(pillLabels()).toEqual(['SRVWIN01 (host:572750b8)', 'user:it.admin@572750b8@local']);
    expect(visibleRow().getByText('SRVWIN01')).toBeInTheDocument();
    fireEvent.click(visibleRow().getByRole('button', { name: 'SRVWIN01 (host:572750b8)' }));
    expect(onEntityFilterChange).toHaveBeenCalledWith('host:572750b8');
  });

  it('selects a pill and clears it on the second click', () => {
    const onEntityFilterChange = jest.fn();
    const impact = paged([{ entityId: 'host-1', count: 1 }]);

    const { unmount } = renderImpact({ impact, onEntityFilterChange });
    fireEvent.click(visibleRow().getByRole('button', { name: 'host-1' }));
    expect(onEntityFilterChange).toHaveBeenCalledWith('host-1');
    unmount();

    renderImpact({ impact, entityFilter: 'host-1', onEntityFilterChange });
    fireEvent.click(visibleRow().getByRole('button', { name: 'host-1' }));
    expect(onEntityFilterChange).toHaveBeenLastCalledWith(null);
  });

  describe('paging', () => {
    it('shows no +n pill when nothing is left to load', () => {
      renderImpact({ impact: paged([{ entityId: 'host-1', count: 1 }]) });

      expect(screen.queryByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).not.toBeInTheDocument();
    });

    it('counts the pills left to load on the +n pill and loads more on click', () => {
      const showMore = jest.fn();
      renderImpact({
        impact: paged([{ entityId: 'host-1', count: 1 }], { remaining: 8482, showMore }),
      });

      const overflow = within(screen.getByTestId(IMPACT_OVERFLOW_TEST_SUBJ));
      expect(overflow.getByText('+8482')).toBeInTheDocument();
      fireEvent.click(overflow.getByRole('button', { name: 'Show 8482 more' }));
      expect(showMore).toHaveBeenCalledTimes(1);
    });

    it('replaces the +n button with an explanation once the server cannot list more', () => {
      const showMore = jest.fn();
      renderImpact({
        impact: paged([{ entityId: 'host-1', count: 1 }], {
          remaining: 1492,
          canShowMore: false,
          reachLimit: 10_000,
          showMore,
        }),
      });

      const overflow = within(screen.getByTestId(IMPACT_OVERFLOW_TEST_SUBJ));
      expect(overflow.queryByRole('button')).not.toBeInTheDocument();
      expect(overflow.getByText('+1492')).toBeInTheDocument();
      const note = overflow.getByRole('note', {
        name: 'Only the first 10000 entities can be listed; 1492 more are not shown.',
      });
      expect(note).toHaveAttribute('tabindex', '0');
      fireEvent.click(note);
      expect(showMore).not.toHaveBeenCalled();
    });

    it('leaves the +n pill out when a request failed, keeping the loaded pills', () => {
      renderImpact({
        impact: paged([{ entityId: 'host-1', count: 1 }], { remaining: 5, loadFailed: true }),
      });

      expect(screen.queryByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).not.toBeInTheDocument();
      expect(pillLabels()).toEqual(['host-1']);
    });

    it('does not ask for another page while one is loading', () => {
      const showMore = jest.fn();
      renderImpact({
        impact: paged([{ entityId: 'host-1', count: 1 }], {
          remaining: 5,
          isLoadingMore: true,
          showMore,
        }),
      });

      expect(
        within(screen.getByTestId(IMPACT_OVERFLOW_TEST_SUBJ)).queryByRole('button')
      ).not.toBeInTheDocument();
      expect(showMore).not.toHaveBeenCalled();
    });

    it('offers to show fewer only once more than the first page has loaded', () => {
      const showFewer = jest.fn();
      const { unmount } = renderImpact({ impact: paged([{ entityId: 'host-1', count: 1 }]) });
      expect(screen.queryByTestId(IMPACT_COLLAPSE_TEST_SUBJ)).not.toBeInTheDocument();
      unmount();

      renderImpact({ impact: paged([{ entityId: 'host-1', count: 1 }], { showFewer }) });
      fireEvent.click(
        within(screen.getByTestId(IMPACT_COLLAPSE_TEST_SUBJ)).getByRole('button', {
          name: 'Show fewer',
        })
      );
      expect(showFewer).toHaveBeenCalledTimes(1);
    });
  });

  describe('selected pill', () => {
    it('pins a selected pill that has not loaded to the end of the pills', () => {
      renderImpact({
        impact: paged(
          [
            { entityId: 'host-1', count: 3 },
            { entityId: 'host-2', count: 2 },
          ],
          { remaining: 5 }
        ),
        entityFilter: 'user-far',
        selectedPill: { entityId: 'user-far', count: 1 },
      });

      expect(pillLabels()).toEqual(['host-1', 'host-2', 'user-far', 'Show 5 more']);
    });

    it('keeps the natural order when the selected pill has loaded', () => {
      renderImpact({
        impact: paged([
          { entityId: 'host-1', count: 3 },
          { entityId: 'host-2', count: 2 },
        ]),
        entityFilter: 'host-1',
        selectedPill: { entityId: 'host-1', count: 3 },
      });

      expect(pillLabels()).toEqual(['host-1', 'host-2']);
    });

    it('still renders the selected pill when no page has any pills', () => {
      renderImpact({
        impact: paged([]),
        entityFilter: 'host-1',
        selectedPill: { entityId: 'host-1', count: 1 },
      });

      expect(pillLabels()).toEqual(['host-1']);
    });
  });
});
