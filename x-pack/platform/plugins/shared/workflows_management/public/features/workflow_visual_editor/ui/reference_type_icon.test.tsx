/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ReferenceTypeIcon } from './reference_type_icon';

describe('ReferenceTypeIcon', () => {
  it.each([
    ['array', 'tokenArray'],
    ['object', 'tokenObject'],
    ['string', 'tokenString'],
    ['number', 'tokenNumber'],
  ])('draws the %s type with the %s token', (type, iconType) => {
    render(<ReferenceTypeIcon type={type} />);

    expect(screen.getByTitle(type)).toHaveAttribute('data-euiicon-type', iconType);
  });

  it('falls back to the unknown token for a type nothing draws', () => {
    render(<ReferenceTypeIcon type="mystery" />);

    expect(screen.getByTitle('mystery')).toBeInTheDocument();
  });
});
