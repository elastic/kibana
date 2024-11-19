/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIncompatibleStatBadgeColor } from './get_incompatible_stat_badge_color';

describe('getIncompatibleStatBadgeColor', () => {
  describe('when incompatible is greater than 0', () => {
    it('returns danger', () => {
      expect(getIncompatibleStatBadgeColor(1)).toBe('danger');
    });
  });

  describe('when incompatible is 0', () => {
    it('returns hollow', () => {
      expect(getIncompatibleStatBadgeColor(0)).toBe('hollow');
    });
  });

  describe('when incompatible is undefined', () => {
    it('returns hollow', () => {
      expect(getIncompatibleStatBadgeColor(undefined)).toBe('hollow');
    });
  });
});
