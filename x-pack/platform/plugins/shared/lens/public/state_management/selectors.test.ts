/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAppState, selectTriggerApplyChanges, selectChangesApplied } from '.';

describe('lens selectors', () => {
  describe('selecting changes applied', () => {
    it('should be true when auto-apply disabled and flag is set', () => {
      const lensState = {
        changesApplied: true,
        autoApplyDisabled: true,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });

    it('should be false when auto-apply disabled and flag is false', () => {
      const lensState = {
        changesApplied: false,
        autoApplyDisabled: true,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeFalsy();
    });

    it('should be true when auto-apply enabled no matter what', () => {
      const lensState = {
        changesApplied: false,
        autoApplyDisabled: false,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });
  });
  it('should select apply changes trigger', () => {
    selectTriggerApplyChanges({ lens: { applyChangesCounter: 1 } as LensAppState }); // get the counters in sync

    expect(
      selectTriggerApplyChanges({ lens: { applyChangesCounter: 2 } as LensAppState })
    ).toBeTruthy();
    expect(
      selectTriggerApplyChanges({ lens: { applyChangesCounter: 2 } as LensAppState })
    ).toBeFalsy();
  });
});
