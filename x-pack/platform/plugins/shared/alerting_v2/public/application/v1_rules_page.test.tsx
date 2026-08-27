/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MANAGEMENT_RULES_V1_TAB_PATH } from '../constants';
import { V1RulesPage } from './v1_rules_page';

const mockCreateSubHistory = jest.fn(() => ({ pathname: '/' }));
const mockGetRulesPage = jest.fn(() => <div data-test-subj="embeddedV1RulesPage">v1 page</div>);
const mockSetBreadcrumbs = jest.fn();

jest.mock('react-router-dom', () => ({
  useHistory: () => ({ createSubHistory: mockCreateSubHistory }),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ getRulesPage: mockGetRulesPage }),
}));

jest.mock('./breadcrumb_context', () => ({
  useSetBreadcrumbs: () => mockSetBreadcrumbs,
}));

describe('V1RulesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSubHistory.mockReturnValue({ pathname: '/' });
  });

  it('embeds the classic rules page on a /v1 sub-history', () => {
    render(<V1RulesPage />);

    expect(mockCreateSubHistory).toHaveBeenCalledWith(MANAGEMENT_RULES_V1_TAB_PATH);
    expect(mockGetRulesPage).toHaveBeenCalledWith({
      history: { pathname: '/' },
      setBreadcrumbs: mockSetBreadcrumbs,
    });
    expect(screen.getByTestId('embeddedV1RulesPage')).toHaveTextContent('v1 page');
  });
});
