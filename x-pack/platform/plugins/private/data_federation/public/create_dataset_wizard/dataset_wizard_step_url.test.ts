/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADDITIONAL_SETTINGS_STEP,
  DATA_SOURCE_STEP,
  FLOW_3_REVIEW_STEP,
  LOGISTICS_STEP,
  PREVIEW_RESULTS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  DATASET_WIZARD_FLOW_VARIANT_4,
} from './dataset_wizard_flow_variant';
import {
  buildWizardStepSearch,
  getNextWizardStep,
  getPreviousWizardStep,
  getReviewStep,
  getWizardSteps,
  isWizardStepAfter,
  parseWizardStepFromSearch,
} from './dataset_wizard_step_url';

describe('dataset_wizard_step_url', () => {
  describe('parseWizardStepFromSearch', () => {
    it('returns undefined when step param is missing', () => {
      expect(parseWizardStepFromSearch('', DATASET_WIZARD_FLOW_VARIANT_1)).toBeUndefined();
    });

    it('parses a valid step', () => {
      expect(parseWizardStepFromSearch('?step=2', DATASET_WIZARD_FLOW_VARIANT_1)).toBe(
        ADDITIONAL_SETTINGS_STEP
      );
    });

    it('returns undefined for invalid step values', () => {
      expect(parseWizardStepFromSearch('?step=9', DATASET_WIZARD_FLOW_VARIANT_1)).toBeUndefined();
      expect(parseWizardStepFromSearch('?step=abc', DATASET_WIZARD_FLOW_VARIANT_1)).toBeUndefined();
      expect(parseWizardStepFromSearch('?step=0', DATASET_WIZARD_FLOW_VARIANT_1)).toBeUndefined();
    });

    it('parses the flow 3 review step', () => {
      expect(parseWizardStepFromSearch('?step=5', DATASET_WIZARD_FLOW_VARIANT_3)).toBe(
        FLOW_3_REVIEW_STEP
      );
    });

    it('reads the number as a position within the flow', () => {
      expect(parseWizardStepFromSearch('?step=2', DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        DATA_SOURCE_STEP
      );
      expect(parseWizardStepFromSearch('?step=3', DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        ADDITIONAL_SETTINGS_STEP
      );
      expect(parseWizardStepFromSearch('?step=6', DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        FLOW_3_REVIEW_STEP
      );
    });
  });

  describe('buildWizardStepSearch', () => {
    it('adds step to the query string', () => {
      expect(
        buildWizardStepSearch('', ADDITIONAL_SETTINGS_STEP, DATASET_WIZARD_FLOW_VARIANT_1)
      ).toBe('?step=2');
    });

    it('removes step from the query string on logistics step', () => {
      expect(
        buildWizardStepSearch('?step=3&foo=bar', LOGISTICS_STEP, DATASET_WIZARD_FLOW_VARIANT_1)
      ).toBe('?foo=bar');
    });

    it('updates an existing step while preserving other params', () => {
      expect(
        buildWizardStepSearch('?step=2&foo=bar', REVIEW_STEP, DATASET_WIZARD_FLOW_VARIANT_1)
      ).toBe('?step=4&foo=bar');
      expect(
        buildWizardStepSearch('?step=2&foo=bar', FLOW_3_REVIEW_STEP, DATASET_WIZARD_FLOW_VARIANT_3)
      ).toBe('?step=5&foo=bar');
    });

    it('numbers the flow 4 steps in the order they are shown', () => {
      expect(buildWizardStepSearch('', DATA_SOURCE_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        '?step=2'
      );
      expect(
        buildWizardStepSearch('', ADDITIONAL_SETTINGS_STEP, DATASET_WIZARD_FLOW_VARIANT_4)
      ).toBe('?step=3');
      expect(buildWizardStepSearch('', FLOW_3_REVIEW_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        '?step=6'
      );
    });
  });

  describe('getWizardSteps', () => {
    it('includes preview results before review in flow 3 and flow 4', () => {
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_3)).toEqual([
        LOGISTICS_STEP,
        ADDITIONAL_SETTINGS_STEP,
        SCHEMA_MAPPINGS_STEP,
        PREVIEW_RESULTS_STEP,
        FLOW_3_REVIEW_STEP,
      ]);
      expect(getReviewStep(DATASET_WIZARD_FLOW_VARIANT_3)).toBe(FLOW_3_REVIEW_STEP);
      expect(getReviewStep(DATASET_WIZARD_FLOW_VARIANT_4)).toBe(FLOW_3_REVIEW_STEP);
    });

    it('puts the data source step between file and additional settings in flow 4', () => {
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_4)).toEqual([
        LOGISTICS_STEP,
        DATA_SOURCE_STEP,
        ADDITIONAL_SETTINGS_STEP,
        SCHEMA_MAPPINGS_STEP,
        PREVIEW_RESULTS_STEP,
        FLOW_3_REVIEW_STEP,
      ]);
    });

    it('keeps the data source step out of the other flows', () => {
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_1)).not.toContain(DATA_SOURCE_STEP);
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_3)).not.toContain(DATA_SOURCE_STEP);
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).not.toContain(DATA_SOURCE_STEP);
    });
  });

  describe('step order helpers', () => {
    it('orders steps by position rather than by id', () => {
      expect(
        isWizardStepAfter(ADDITIONAL_SETTINGS_STEP, DATA_SOURCE_STEP, DATASET_WIZARD_FLOW_VARIANT_4)
      ).toBe(true);
      expect(
        isWizardStepAfter(DATA_SOURCE_STEP, ADDITIONAL_SETTINGS_STEP, DATASET_WIZARD_FLOW_VARIANT_4)
      ).toBe(false);
    });

    it('walks forwards and backwards through the flow', () => {
      expect(getNextWizardStep(LOGISTICS_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        DATA_SOURCE_STEP
      );
      expect(getNextWizardStep(DATA_SOURCE_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        ADDITIONAL_SETTINGS_STEP
      );
      expect(getPreviousWizardStep(ADDITIONAL_SETTINGS_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBe(
        DATA_SOURCE_STEP
      );
      expect(getPreviousWizardStep(LOGISTICS_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBeUndefined();
      expect(getNextWizardStep(FLOW_3_REVIEW_STEP, DATASET_WIZARD_FLOW_VARIANT_4)).toBeUndefined();
    });

    it('skips the flow 4 step in flows that do not have it', () => {
      expect(getNextWizardStep(LOGISTICS_STEP, DATASET_WIZARD_FLOW_VARIANT_3)).toBe(
        ADDITIONAL_SETTINGS_STEP
      );
      expect(getPreviousWizardStep(ADDITIONAL_SETTINGS_STEP, DATASET_WIZARD_FLOW_VARIANT_1)).toBe(
        LOGISTICS_STEP
      );
    });

    it('skips preview results in flow 3 9.6', () => {
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).toEqual([
        LOGISTICS_STEP,
        ADDITIONAL_SETTINGS_STEP,
        SCHEMA_MAPPINGS_STEP,
        REVIEW_STEP,
      ]);
      expect(getReviewStep(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).toBe(REVIEW_STEP);
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_1)).toEqual([
        LOGISTICS_STEP,
        ADDITIONAL_SETTINGS_STEP,
        SCHEMA_MAPPINGS_STEP,
        REVIEW_STEP,
      ]);
    });
  });
});
