/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensTagCloudState } from '@kbn/lens-common';
import { TAGCLOUD_ORIENTATION } from '@kbn/lens-common';
import { tagcloudStateAdapter } from './tagcloud';

const baseState: LensTagCloudState = {
  layerId: 'layer1',
  tagAccessor: 'tag1',
  valueAccessor: 'value1',
  maxFontSize: 72,
  minFontSize: 18,
  orientation: TAGCLOUD_ORIENTATION.SINGLE,
  showLabel: true,
};

describe('tagcloudStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts orientation to API form values', () => {
      const result = tagcloudStateAdapter.stateToFormValues(baseState);
      expect(result['styling.orientation']).toBe('horizontal');
    });

    it('converts right angled orientation to vertical', () => {
      const state: LensTagCloudState = {
        ...baseState,
        orientation: TAGCLOUD_ORIENTATION.RIGHT_ANGLED,
      };
      const result = tagcloudStateAdapter.stateToFormValues(state);
      expect(result['styling.orientation']).toBe('vertical');
    });

    it('converts multiple orientation to angled', () => {
      const state: LensTagCloudState = {
        ...baseState,
        orientation: TAGCLOUD_ORIENTATION.MULTIPLE,
      };
      const result = tagcloudStateAdapter.stateToFormValues(state);
      expect(result['styling.orientation']).toBe('angled');
    });

    it('converts font size to API form values', () => {
      const state: LensTagCloudState = {
        ...baseState,
        minFontSize: 10,
        maxFontSize: 100,
      };
      const result = tagcloudStateAdapter.stateToFormValues(state);
      expect(result['styling.font_size.min']).toBe(10);
      expect(result['styling.font_size.max']).toBe(100);
    });

    it('converts showLabel to API form values', () => {
      const state: LensTagCloudState = {
        ...baseState,
        showLabel: false,
      };
      const result = tagcloudStateAdapter.stateToFormValues(state);
      expect(result['styling.caption.visible']).toBe(false);
    });
  });

  describe('formValuesToState', () => {
    it('converts API orientation back to internal state', () => {
      const result = tagcloudStateAdapter.formValuesToState(baseState, {
        'styling.orientation': 'vertical',
      });
      expect(result.orientation).toBe(TAGCLOUD_ORIENTATION.RIGHT_ANGLED);
      expect(result.layerId).toBe('layer1');
    });

    it('converts API angled orientation back to internal state', () => {
      const result = tagcloudStateAdapter.formValuesToState(baseState, {
        'styling.orientation': 'angled',
      });
      expect(result.orientation).toBe(TAGCLOUD_ORIENTATION.MULTIPLE);
    });

    it('converts API font size back to internal state', () => {
      const result = tagcloudStateAdapter.formValuesToState(baseState, {
        'styling.font_size.min': 12,
        'styling.font_size.max': 96,
      });
      expect(result.minFontSize).toBe(12);
      expect(result.maxFontSize).toBe(96);
    });

    it('converts API caption visibility back to internal state', () => {
      const result = tagcloudStateAdapter.formValuesToState(baseState, {
        'styling.caption.visible': false,
      });
      expect(result.showLabel).toBe(false);
    });

    it('preserves non-styling properties', () => {
      const stateWithExtras: LensTagCloudState = {
        ...baseState,
        tagAccessor: 'customTag',
      };
      const result = tagcloudStateAdapter.formValuesToState(stateWithExtras, {
        'styling.orientation': 'horizontal',
      });
      expect(result.tagAccessor).toBe('customTag');
    });
  });

  describe('round-trip', () => {
    it('preserves styling through stateToFormValues → formValuesToState', () => {
      const state: LensTagCloudState = {
        ...baseState,
        orientation: TAGCLOUD_ORIENTATION.MULTIPLE,
        minFontSize: 14,
        maxFontSize: 80,
        showLabel: false,
      };

      const formValues = tagcloudStateAdapter.stateToFormValues(state);
      const result = tagcloudStateAdapter.formValuesToState(baseState, formValues);

      expect(result.orientation).toBe(TAGCLOUD_ORIENTATION.MULTIPLE);
      expect(result.minFontSize).toBe(14);
      expect(result.maxFontSize).toBe(80);
      expect(result.showLabel).toBe(false);
    });
  });
});
