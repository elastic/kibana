/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createEvent, fireEvent, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

import { renderWithTestingProviders } from '../../../common/mock';
import { CASE_SETTINGS_TITLE } from '../translations';
import { useAllCasesNavigation } from '../../../common/navigation/hooks';
import { ConfigureCasesAppHeader } from './configure_cases_app_header';

jest.mock('../../../common/navigation/hooks');

describe('ConfigureCasesAppHeader', () => {
  it('renders the app header with the settings title', () => {
    renderWithTestingProviders(<ConfigureCasesAppHeader />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      CASE_SETTINGS_TITLE
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('navigates to all cases and prevents the anchor default navigation on back click', () => {
    renderWithTestingProviders(<ConfigureCasesAppHeader />);

    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    const clickEvent = createEvent.click(backButton);
    fireEvent(backButton, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(useAllCasesNavigation().navigateToAllCases).toHaveBeenCalled();
  });
});
