/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveKiStatus } from '../../../../../../common/ki_expiry';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { getViewKiHeaderBadges } from './view_ki_header_badges';

const FIXED_NOW_MS = Date.parse('2026-06-15T12:00:00.000Z');
const PAST_EXPIRES_AT = '2020-01-01T00:00:00.000Z';
const FUTURE_EXPIRES_AT = '2030-01-01T00:00:00.000Z';
const STATUS_BADGE_TEST_SUBJ = 'contextViewKiStatusBadge';

const badgeTestSubjs = (badges: ReturnType<typeof getViewKiHeaderBadges> | undefined): string[] =>
  (badges ?? []).map((badge) => badge['data-test-subj'] as string);

const statusBadge = (badges: ReturnType<typeof getViewKiHeaderBadges> | undefined) =>
  badges?.find((b) => b['data-test-subj'] === STATUS_BADGE_TEST_SUBJ);

describe('getViewKiHeaderBadges', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns undefined when there are no badges to show', () => {
    expect(getViewKiHeaderBadges({})).toBeUndefined();
    expect(getViewKiHeaderBadges({ expires_at: FUTURE_EXPIRES_AT })).toBeUndefined();
  });

  it('includes only the type badge for an active document with type', () => {
    const document: KiDocument = { type: 'playbook', expires_at: FUTURE_EXPIRES_AT };
    const badges = getViewKiHeaderBadges(document, 'active');

    expect(resolveKiStatus('active', document.expires_at)).toBe('active');
    expect(badgeTestSubjs(badges)).toEqual(['contextViewKiTypeBadge']);
    expect(badges?.[0]?.color).toBe('hollow');
  });

  it('includes status badge when lifecycle is deleted', () => {
    const document: KiDocument = { type: 'policy', expires_at: PAST_EXPIRES_AT };
    const badges = getViewKiHeaderBadges(document, 'deleted');

    expect(resolveKiStatus('deleted', document.expires_at)).toBe('deleted');
    expect(badgeTestSubjs(badges)).toEqual(['contextViewKiTypeBadge', STATUS_BADGE_TEST_SUBJ]);
    expect(statusBadge(badges)?.color).toBe('danger');
  });

  it('includes status badge when expires_at is in the past', () => {
    const document: KiDocument = { type: 'faq', expires_at: PAST_EXPIRES_AT };
    const badges = getViewKiHeaderBadges(document);

    expect(resolveKiStatus(undefined, document.expires_at)).toBe('expired');
    expect(badgeTestSubjs(badges)).toEqual(['contextViewKiTypeBadge', STATUS_BADGE_TEST_SUBJ]);
    expect(statusBadge(badges)?.color).toBe('warning');
  });

  it('shows status badge without type when only expiry applies', () => {
    const document: KiDocument = { expires_at: PAST_EXPIRES_AT };
    const badges = getViewKiHeaderBadges(document);

    expect(badgeTestSubjs(badges)).toEqual([STATUS_BADGE_TEST_SUBJ]);
  });

  it('prefers deleted over expired when both apply', () => {
    const document: KiDocument = { type: 'playbook', expires_at: PAST_EXPIRES_AT };
    const badges = getViewKiHeaderBadges(document, 'deleted');

    expect(resolveKiStatus('deleted', document.expires_at)).toBe('deleted');
    expect(badgeTestSubjs(badges)).toEqual(['contextViewKiTypeBadge', STATUS_BADGE_TEST_SUBJ]);
    expect(statusBadge(badges)?.label).toBe('deleted');
  });

  it('ignores empty type string', () => {
    const document: KiDocument = { type: '', expires_at: PAST_EXPIRES_AT };
    const badges = getViewKiHeaderBadges(document);

    expect(badgeTestSubjs(badges)).toEqual([STATUS_BADGE_TEST_SUBJ]);
  });
});
