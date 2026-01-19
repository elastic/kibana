/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../services/job_service', () => 'mlJobService');

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent } from '@testing-library/react';
import { ML_DETECTOR_RULE_APPLIES_TO } from '@kbn/ml-anomaly-utils';

import { EditConditionLink } from './edit_condition_link';

// Common test data
const testAnomaly = {
  actual: [210],
  typical: [1.23],
  detectorIndex: 0,
  source: {
    function: 'mean',
    airline: ['AAL'],
  },
};

describe('EditConditionLink', () => {
  const updateConditionValue = jest.fn();

  // Helper function to get common props
  const getProps = (appliesTo) => ({
    conditionIndex: 0,
    conditionValue: 5,
    appliesTo,
    anomaly: testAnomaly,
    updateConditionValue,
  });

  test(`renders for a condition using actual`, () => {
    const props = getProps(ML_DETECTOR_RULE_APPLIES_TO.ACTUAL);
    const { container } = renderWithI18n(<EditConditionLink {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test(`renders for a condition using typical`, () => {
    const props = getProps(ML_DETECTOR_RULE_APPLIES_TO.TYPICAL);
    const { container } = renderWithI18n(<EditConditionLink {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test(`renders for a condition using diff from typical`, () => {
    const props = getProps(ML_DETECTOR_RULE_APPLIES_TO.DIFF_FROM_TYPICAL);
    const { container } = renderWithI18n(<EditConditionLink {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('calls updateConditionValue on clicking update link', () => {
    const props = getProps(ML_DETECTOR_RULE_APPLIES_TO.ACTUAL);
    const { getByRole } = renderWithI18n(<EditConditionLink {...props} />);

    // Find and click the update button
    const updateButton = getByRole('button', { name: 'Update' });
    fireEvent.click(updateButton);

    // Verify the function was called with the correct arguments
    expect(updateConditionValue).toHaveBeenCalledWith(0, 210);
  });
});
