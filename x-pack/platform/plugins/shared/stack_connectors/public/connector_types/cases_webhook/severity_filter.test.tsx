/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { CaseSeverity, severities, SeverityFilter } from './severity_filter';
const onSeverityChange = jest.fn();
const defaultProps = {
  selectedSeverity: CaseSeverity.LOW,
  onSeverityChange,
};
describe('SeverityFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render EuiSuperSelect with correct options and selected value', () => {
    const { getByTestId, getAllByRole } = render(<SeverityFilter {...defaultProps} />);

    const superSelect = getByTestId('case-severity-selection');

    expect(superSelect).toBeInTheDocument();
    expect(superSelect).toHaveTextContent('Low');
    fireEvent.click(superSelect);
    const options = getAllByRole('option');
    const allSeverities = Object.keys(severities) as CaseSeverity[];
    expect(options).toHaveLength(allSeverities.length);
    options.forEach((option, index) => {
      expect(option).toHaveTextContent(severities[allSeverities[index]].label);
    });
  });

  it('should call onSeverityChange with selected severity when an option is clicked', () => {
    const { getByTestId } = render(<SeverityFilter {...defaultProps} />);

    const superSelect = getByTestId('case-severity-selection');
    fireEvent.click(superSelect);
    const option = getByTestId(`case-severity-selection-${CaseSeverity.MEDIUM}`);
    fireEvent.click(option);

    expect(onSeverityChange).toHaveBeenCalledWith(CaseSeverity.MEDIUM);
  });
});
