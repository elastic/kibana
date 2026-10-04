/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBuiltInStatuses } from '../../../../../../common/utils/statuses';
import { basicCase } from '../../../../../containers/mock';
import { getBadges } from './header_badges';

describe('getBadges', () => {
  const statuses = getBuiltInStatuses();
  const args = {
    caseData: basicCase,
    currentStatus: statuses[0],
    statusOptions: statuses,
    isStatusMenuDisabled: false,
    isSeverityMenuDisabled: false,
    onStatusChanged: jest.fn(),
    onSeverityChanged: jest.fn(),
  };
  const statusBadge = (badges: ReturnType<typeof getBadges>) =>
    badges.find((badge) => badge['data-test-subj'] === 'case-view-status-badge');

  it('names the configured status and offers every option', () => {
    const badge = statusBadge(
      getBadges({ ...args, currentStatus: { ...statuses[1], label: 'Investigating' } })
    );

    expect(badge?.label).toBe('Investigating');
    expect(badge?.tooltip).toBeUndefined();
    expect(badge?.items?.map((item) => item.name)).toEqual(['Open', 'In progress', 'Closed']);
  });

  it('explains why a paused case is waiting in the badge tooltip', () => {
    const badge = statusBadge(
      getBadges({
        ...args,
        caseData: {
          ...basicCase,
          pausedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          pauseReason: 'Awaiting vendor',
        },
      })
    );

    expect(badge?.tooltip).toBe('Awaiting vendor · paused 2 hours ago');
  });

  it('offers no status options when the menu is disabled', () => {
    expect(statusBadge(getBadges({ ...args, isStatusMenuDisabled: true }))?.items).toBeUndefined();
  });
});
