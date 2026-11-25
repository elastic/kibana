/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createEvent, fireEvent, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

import { renderWithTestingProviders } from '../../../common/mock';
import { CREATE_CASE_TITLE } from '../../../common/translations';
import { useAllCasesNavigation } from '../../../common/navigation/hooks';
import * as casesAppHeaderModule from '../../app/cases_app_header';
import { CreateCaseAppHeader } from './create_case_app_header';

jest.mock('../../../common/navigation/hooks');

describe('CreateCaseAppHeader', () => {
  it('renders the app header with the create case title', () => {
    renderWithTestingProviders(<CreateCaseAppHeader />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(CREATE_CASE_TITLE);
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('passes the create cases docLink, showAddIntegrations and an explicit menu to CasesAppHeader', () => {
    const spy = jest.spyOn(casesAppHeaderModule, 'CasesAppHeader');

    renderWithTestingProviders(<CreateCaseAppHeader />);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        docLink: expect.stringContaining('create-cases'),
        showAddIntegrations: true,
        menu: { items: [] },
      }),
      expect.anything()
    );

    spy.mockRestore();
  });

  it('shows the documentation item in the overflow menu', async () => {
    renderWithTestingProviders(<CreateCaseAppHeader />);

    await openAppMenuOverflow();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      expect.stringContaining('create-cases')
    );
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
