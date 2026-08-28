/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADDITIONAL_SETTINGS_STEP,
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
} from './dataset_wizard_flow_variant';
import {
  buildWizardStepSearch,
  getReviewStep,
  getWizardSteps,
  parseWizardStepFromSearch,
} from './dataset_wizard_step_url';

describe('dataset_wizard_step_url', () => {
  describe('parseWizardStepFromSearch', () => {
    it('returns undefined when step param is missing', () => {
      expect(parseWizardStepFromSearch('')).toBeUndefined();
    });

    it('parses a valid step', () => {
      expect(parseWizardStepFromSearch('?step=2')).toBe(ADDITIONAL_SETTINGS_STEP);
    });

    it('returns undefined for invalid step values', () => {
      expect(parseWizardStepFromSearch('?step=9')).toBeUndefined();
      expect(parseWizardStepFromSearch('?step=abc')).toBeUndefined();
    });

    it('parses the flow 3 review step', () => {
      expect(parseWizardStepFromSearch('?step=5')).toBe(FLOW_3_REVIEW_STEP);
    });
  });

  describe('buildWizardStepSearch', () => {
    it('adds step to the query string', () => {
      expect(buildWizardStepSearch('', ADDITIONAL_SETTINGS_STEP)).toBe('?step=2');
    });

    it('removes step from the query string on logistics step', () => {
      expect(buildWizardStepSearch('?step=3&foo=bar', LOGISTICS_STEP)).toBe('?foo=bar');
    });

    it('updates an existing step while preserving other params', () => {
      expect(buildWizardStepSearch('?step=2&foo=bar', REVIEW_STEP)).toBe('?step=4&foo=bar');
      expect(buildWizardStepSearch('?step=2&foo=bar', FLOW_3_REVIEW_STEP)).toBe('?step=5&foo=bar');
    });
  });

  describe('getWizardSteps', () => {
    it('includes preview results before review in flow 3', () => {
      expect(getWizardSteps(DATASET_WIZARD_FLOW_VARIANT_3)).toEqual([
        LOGISTICS_STEP,
        ADDITIONAL_SETTINGS_STEP,
        SCHEMA_MAPPINGS_STEP,
        PREVIEW_RESULTS_STEP,
        FLOW_3_REVIEW_STEP,
      ]);
      expect(getReviewStep(DATASET_WIZARD_FLOW_VARIANT_3)).toBe(FLOW_3_REVIEW_STEP);
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
