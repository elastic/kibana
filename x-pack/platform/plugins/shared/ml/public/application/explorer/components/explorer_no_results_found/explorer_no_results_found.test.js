/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ExplorerNoResultsFound } from './explorer_no_results_found';

describe('ExplorerNoResultsFound', () => {
  test('snapshot', () => {
    const { container } = render(
      <IntlProvider>
        <ExplorerNoResultsFound hasResults={false} selectedJobsRunning={false} />
      </IntlProvider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
