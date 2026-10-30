/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, screen, waitFor } from '@testing-library/react';
import type { CaseStatusDefinition } from '../../../common/types/domain';
import { CaseStatuses } from '../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../common/utils/statuses';
import { TestProviders, renderWithTestingProviders } from '../../common/mock';
import * as customStatuses from '../../common/custom_statuses';
import * as api from '../../containers/api';
import { CaseStatusBadge } from './case_status_badge';
import { statuses as categoryStatuses } from './config';
import { useCaseStatus, useCaseStatuses } from './use_case_statuses';

const triage: CaseStatusDefinition = {
  key: 'triage',
  label: 'Triage',
  color: 'accent',
  category: 'not_started',
  order: 1,
  isDefault: false,
  disabled: false,
};
const retired: CaseStatusDefinition = {
  ...triage,
  key: 'retired',
  label: 'Retired',
  category: 'active',
  order: 2,
  disabled: true,
};
const waiting: CaseStatusDefinition = {
  ...triage,
  key: 'waiting',
  label: 'Waiting',
  category: 'active',
  order: 3,
};
const investigating: CaseStatusDefinition = {
  ...DEFAULT_CASE_STATUSES[1],
  label: 'Investigating',
  color: 'danger',
  order: 4,
};
const spaceStatuses: CaseStatusDefinition[] = [
  { ...DEFAULT_CASE_STATUSES[0], order: 0 },
  triage,
  retired,
  waiting,
  investigating,
  { ...DEFAULT_CASE_STATUSES[2], order: 5 },
];

describe('useCaseStatuses', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when custom statuses are off', () => {
    beforeEach(() => {
      jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(false);
    });

    it('lists the three statuses with their usual labels and colors', () => {
      const { result } = renderHook(() => useCaseStatuses(), { wrapper: TestProviders });

      expect(
        result.current.statuses.map(({ key, label, color }) => ({ key, label, color }))
      ).toEqual([
        { key: 'open', label: categoryStatuses.open.label, color: categoryStatuses.open.color },
        {
          key: 'in-progress',
          label: categoryStatuses['in-progress'].label,
          color: categoryStatuses['in-progress'].color,
        },
        {
          key: 'closed',
          label: categoryStatuses.closed.label,
          color: categoryStatuses.closed.color,
        },
      ]);
      expect(result.current.isCustomStatusesEnabled).toBe(false);
    });

    it('ignores the status key of a case', () => {
      const { result } = renderHook(
        () => useCaseStatus({ status: CaseStatuses['in-progress'], statusKey: 'waiting' }),
        { wrapper: TestProviders }
      );

      expect(result.current.key).toBe('in-progress');
    });

    it('renders the badge exactly as before', () => {
      renderWithTestingProviders(
        <CaseStatusBadge theCase={{ status: CaseStatuses.open, statusKey: 'triage' }} />
      );

      expect(screen.getByTestId('case-status-badge-open')).toHaveTextContent(
        categoryStatuses.open.label
      );
    });
  });

  describe('when custom statuses are on', () => {
    beforeEach(() => {
      jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
      jest.spyOn(api, 'getCaseStatuses').mockResolvedValue(spaceStatuses);
    });

    const renderStatuses = async () => {
      const view = renderHook(() => useCaseStatuses(), { wrapper: TestProviders });
      await waitFor(() => expect(view.result.current.statuses).toEqual(spaceStatuses));
      return view;
    };

    it('lists the enabled statuses in admin order', async () => {
      const { result } = await renderStatuses();

      expect(result.current.enabledStatuses.map(({ key }) => key)).toEqual([
        'open',
        'triage',
        'waiting',
        'in-progress',
        'closed',
      ]);
    });

    it('resolves the status a case is in', async () => {
      const { result } = await renderStatuses();

      expect(result.current.getStatus({ status: CaseStatuses.open, statusKey: 'triage' })).toBe(
        triage
      );
    });

    it('reads a case without a status key as the default status of its category', async () => {
      const { result } = await renderStatuses();

      expect(
        result.current.getStatus({ status: CaseStatuses['in-progress'], statusKey: null })
      ).toBe(investigating);
      expect(result.current.getStatus({ status: CaseStatuses['in-progress'] }).label).toBe(
        'Investigating'
      );
    });

    it('reads an unknown status key as the default status of the category', async () => {
      const { result } = await renderStatuses();

      expect(
        result.current.getStatus({ status: CaseStatuses.closed, statusKey: 'deleted' }).key
      ).toBe('closed');
    });

    it('adds a disabled current status to the pickable statuses', async () => {
      const { result } = await renderStatuses();

      expect(result.current.getPickableStatuses(retired).map(({ key }) => key)).toEqual([
        'open',
        'triage',
        'retired',
        'waiting',
        'in-progress',
        'closed',
      ]);
      expect(result.current.getPickableStatuses(triage)).toEqual(result.current.enabledStatuses);
    });

    it('finds the default status of a category, not the first in order', async () => {
      const { result } = await renderStatuses();

      expect(result.current.getCategoryDefaultStatus('active').key).toBe('in-progress');
      expect(result.current.getCategoryDefaultStatus('done').key).toBe('closed');
    });

    it('renders the badge with the label and color of the status', async () => {
      renderWithTestingProviders(
        <CaseStatusBadge theCase={{ status: CaseStatuses.open, statusKey: 'triage' }} />
      );

      await waitFor(() =>
        expect(screen.getByTestId('case-status-badge-open')).toHaveTextContent('Triage')
      );
    });
  });
});
