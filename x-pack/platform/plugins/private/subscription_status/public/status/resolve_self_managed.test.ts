/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolveSelfManagedStatusParams } from './resolve_self_managed';
import { resolveSelfManagedStatus } from './resolve_self_managed';

const NOW = new Date('2026-10-28T12:00:00Z').getTime();
const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
const COMPARE_URL = 'https://www.elastic.co/subscriptions';
const MANAGE_URL = '/app/management/stack/license_management';

const COMPARE_ACTION = {
  id: 'compare_features',
  label: 'Compare license features',
  href: COMPARE_URL,
  external: true,
};

const resolve = (
  license: Partial<ResolveSelfManagedStatusParams['license']>,
  canManageLicense = true
) =>
  resolveSelfManagedStatus({
    license: {
      isAvailable: true,
      type: 'trial',
      status: 'active',
      expiryDateInMillis: NOW + 18 * DAY_IN_MILLIS,
      ...license,
    },
    canManageLicense,
    urls: { compareFeatures: COMPARE_URL, manageLicense: MANAGE_URL },
  });

describe('resolveSelfManagedStatus', () => {
  beforeAll(() => jest.useFakeTimers({ now: NOW }));
  afterAll(() => jest.useRealTimers());

  it('shows the days left of an active trial and lets admins manage the license', () => {
    expect(resolve({})).toEqual({
      kind: 'popover',
      label: 'Trial',
      meter: {
        label: 'Enterprise trial',
        value: '18 days left',
        detail: 'Expires Nov 15, 2026',
        percent: 40,
        urgent: false,
      },
      primaryAction: {
        id: 'manage_license',
        label: 'Manage license',
        href: MANAGE_URL,
        external: false,
      },
      secondaryAction: COMPARE_ACTION,
      licenseType: 'trial',
    });
  });

  it.each([
    [4, '4 days left', false, undefined],
    [3, '3 days left', true, 'warning'],
    [1, '1 day left', true, 'warning'],
  ])(
    'shows a trial with %d days left as "%s", urgent: %s',
    (daysLeft, value, urgent, badgeColor) => {
      const status = resolve({ expiryDateInMillis: NOW + daysLeft * DAY_IN_MILLIS });
      expect(status).toMatchObject({ meter: { value, urgent } });
      expect(status).toHaveProperty('badgeColor', badgeColor);
    }
  );

  it('asks non-admins with an expired trial to contact their admin', () => {
    expect(
      resolve({ status: 'expired', expiryDateInMillis: NOW - 3 * DAY_IN_MILLIS }, false)
    ).toEqual({
      kind: 'popover',
      label: 'Trial expired',
      badgeColor: 'warning',
      title: 'Your trial ended on Oct 25, 2026',
      description:
        'Paid features are no longer available. Contact your admin to update the license.',
      primaryAction: COMPARE_ACTION,
      primaryActionStyle: 'tinted',
      licenseType: 'trial',
    });
  });

  it('offers a cloud trial on the Basic license', () => {
    expect(resolve({ type: 'basic' })).toEqual({
      kind: 'popover',
      label: 'Basic',
      badgeColor: 'hollow',
      description: "You're on the free Basic license.",
      primaryAction: COMPARE_ACTION,
      primaryActionStyle: 'tinted',
      secondaryAction: {
        id: 'start_cloud_trial',
        label: 'Start a cloud trial',
        href: 'https://cloud.elastic.co/registration',
        external: true,
      },
      licenseType: 'basic',
    });
  });

  it.each([
    ['a paid license', { type: 'platinum' as const }],
    ['an invalid trial', { status: 'invalid' as const }],
    ['a trial without an expiry date', { expiryDateInMillis: undefined }],
    ['an unavailable license', { isAvailable: false }],
  ])('shows no badge for %s', (_, license) => {
    expect(resolve(license)).toBeUndefined();
  });
});
