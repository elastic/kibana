/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ExplorerNoInfluencersFound } from './explorer_no_influencers_found';

describe('ExplorerNoInfluencersFound', () => {
  test('snapshot', () => {
    const { container } = render(
      <IntlProvider>
        <ExplorerNoInfluencersFound viewBySwimlaneFieldName="field_name" />
      </IntlProvider>
    );
    expect(container).toMatchSnapshot();
  });
});
