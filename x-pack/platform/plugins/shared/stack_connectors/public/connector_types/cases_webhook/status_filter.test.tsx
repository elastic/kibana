/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CaseStatuses } from '@kbn/cases-components';
import { fireEvent, render } from '@testing-library/react';
import { caseStatuses, statuses, StatusFilter } from './status_filter';
const onStatusChanged = jest.fn();
const defaultProps = {
  selectedStatus: CaseStatuses.open,
  onStatusChanged,
};
describe('StatusFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render EuiSuperSelect with correct options and selected value', () => {
    const { getByTestId, getAllByRole } = render(<StatusFilter {...defaultProps} />);

    const superSelect = getByTestId('case-status-filter');

    expect(superSelect).toBeInTheDocument();
    expect(superSelect).toHaveTextContent('Open');
    fireEvent.click(superSelect);
    const options = getAllByRole('option');
    expect(options).toHaveLength(caseStatuses.length);
    options.forEach((option, index) => {
      expect(option).toHaveTextContent(statuses[caseStatuses[index]].label);
    });
  });

  it('should call onStatusChanged with selected status when an option is clicked', () => {
    const { getByTestId } = render(<StatusFilter {...defaultProps} />);

    const superSelect = getByTestId('case-status-filter');
    fireEvent.click(superSelect);
    const option = getByTestId(`case-status-filter-${CaseStatuses.closed}`);
    fireEvent.click(option);

    expect(onStatusChanged).toHaveBeenCalledWith(CaseStatuses.closed);
  });
});
