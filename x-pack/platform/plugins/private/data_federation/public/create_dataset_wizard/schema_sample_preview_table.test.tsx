/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { SchemaSamplePreviewTable } from './schema_sample_preview_table';

describe('SchemaSamplePreviewTable', () => {
  it('renders a field type icon next to each column header name', () => {
    render(
      <EuiProvider>
        <SchemaSamplePreviewTable
          fields={[
            { name: 'timestamp', type: 'date' },
            { name: 'message', type: 'text' },
            { name: 'status_code', type: 'long' },
          ]}
          testSubjPrefix="datasetWizardSchemaSample"
        />
      </EuiProvider>
    );

    expect(screen.getByText('timestamp')).toBeInTheDocument();
    expect(screen.getByText('Date')).toHaveAttribute('data-euiicon-type', 'tokenDate');
    expect(screen.getByText('message')).toBeInTheDocument();
    expect(screen.getByText('Text')).toHaveAttribute('data-euiicon-type', 'tokenString');
    expect(screen.getByText('status_code')).toBeInTheDocument();
    expect(screen.getByText('long')).toHaveAttribute('data-euiicon-type', 'tokenNumber');
  });
});
