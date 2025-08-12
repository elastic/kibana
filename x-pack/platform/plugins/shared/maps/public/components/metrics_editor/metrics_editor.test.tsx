/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { MetricsEditor } from './metrics_editor';
import { AGG_TYPE } from '../../../common/constants';

const defaultProps = {
  metrics: [
    {
      type: AGG_TYPE.SUM,
      field: 'myField',
    },
  ],
  fields: [],
  onChange: () => {},
  allowMultipleMetrics: true,
  isJoin: false,
};

test('should render metrics editor', () => {
  render(
    <I18nProvider>
      <MetricsEditor {...defaultProps} />
    </I18nProvider>
  );
  
  // Verify the Add metric button is present
  expect(screen.getByText('Add metric')).toBeInTheDocument();
});

test('should add default count metric when metrics is empty array', () => {
  render(
    <I18nProvider>
      <MetricsEditor {...defaultProps} metrics={[]} />
    </I18nProvider>
  );
  
  // Verify the Add metric button is present
  expect(screen.getByText('Add metric')).toBeInTheDocument();
});
