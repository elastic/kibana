/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { KiRow } from './ki_row';

const ki: KiListItem = {
  ki_id: 'ki-1',
  type: 'playbook',
  title: 'Verify the order, check the SLA window, then issue store credit.',
  description: 'Detailed steps for refunds.',
  source_label: 'Google Drive',
  version: 'v1',
};

describe('KiRow', () => {
  it('renders the title, metadata, and version badge', () => {
    render(<KiRow ki={ki} sourceLabel="Google Drive" />);

    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent(
      'Verify the order, check the SLA window, then issue store credit.'
    );
    expect(screen.getByTestId('contextKiRowMetadata')).toHaveTextContent('Playbook · Google Drive');
    expect(screen.getByTestId('contextKiRowVersion')).toHaveTextContent('v1');
  });

  it('renders type-only metadata when no source label is available', () => {
    render(
      <KiRow ki={{ ...ki, source_label: undefined, version: undefined }} sourceLabel={undefined} />
    );

    expect(screen.getByTestId('contextKiRowMetadata')).toHaveTextContent('Playbook');
    expect(screen.queryByTestId('contextKiRowVersion')).not.toBeInTheDocument();
  });
});
