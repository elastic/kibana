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
  id: 'ki-1',
  type: 'playbook',
  title: 'Verify the order, check the SLA window, then issue store credit.',
};

describe('KiRow', () => {
  it('renders the title and type', () => {
    render(<KiRow ki={ki} />);

    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent(
      'Verify the order, check the SLA window, then issue store credit.'
    );
    expect(screen.getByTestId('contextKiRowType')).toHaveTextContent('Playbook');
  });
});
