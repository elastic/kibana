/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createEvent, fireEvent, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

import { renderWithTestingProviders } from '../../../../common/mock';
import { CREATE_CASE_TITLE } from '../../../../common/translations';
import { useAllCasesNavigation } from '../../../../common/navigation/hooks';
import { CreateCaseAppHeader } from './create_case_app_header';

jest.mock('../../../../common/navigation/hooks');

describe('CreateCaseAppHeader', () => {
  it('renders the app header with the create case title', () => {
    renderWithTestingProviders(<CreateCaseAppHeader />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(CREATE_CASE_TITLE);
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('navigates to all cases and prevents the anchor default navigation on back click', () => {
    renderWithTestingProviders(<CreateCaseAppHeader />);

    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    const clickEvent = createEvent.click(backButton);
    fireEvent(backButton, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(useAllCasesNavigation().navigateToAllCases).toHaveBeenCalled();
  });
});
