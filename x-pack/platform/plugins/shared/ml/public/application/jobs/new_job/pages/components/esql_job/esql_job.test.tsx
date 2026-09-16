/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { Page } from './esql_job';

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      application: {
        getUrlForApp: jest.fn(),
        navigateToApp: jest.fn(),
      },
    },
  }),
  useNavigateToPath: () => jest.fn(),
}));

jest.mock('./esql_query_step', () => ({
  EsqlQueryStep: () => <div data-test-subj="mlEsqlQueryStep" />,
}));

jest.mock('./esql_time_range_step', () => ({
  EsqlTimeRangeStep: () => <div data-test-subj="mlEsqlTimeRangeStep" />,
}));

jest.mock('./esql_preview_panel', () => ({
  EsqlPreviewPanel: () => <div data-test-subj="mlEsqlPreviewPanel" />,
}));

describe('ES|QL job page', () => {
  it('renders without a data source context', () => {
    renderWithI18n(<Page />);

    expect(screen.getByTestId('mlPageEsqlJob')).toBeInTheDocument();
    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('ES|QL');
    expect(screen.getByTestId('mlEsqlQueryStep')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlTimeRangeStep')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlPreviewPanel')).toBeInTheDocument();
  });
});
