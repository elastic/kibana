/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { FieldTypeWithIcon } from './field_type_with_icon';

describe('FieldTypeWithIcon', () => {
  it('uses a numeric token icon for the numeric main type', () => {
    render(
      <EuiProvider>
        <FieldTypeWithIcon type="numeric" />
      </EuiProvider>
    );

    expect(screen.getByTitle('numeric')).toHaveAttribute('data-euiicon-type', 'tokenNumber');
  });

  it('keeps the question icon for unmapped types', () => {
    render(
      <EuiProvider>
        <FieldTypeWithIcon type="other" />
      </EuiProvider>
    );

    expect(screen.getByTitle('other')).toHaveAttribute('data-euiicon-type', 'question');
  });
});
