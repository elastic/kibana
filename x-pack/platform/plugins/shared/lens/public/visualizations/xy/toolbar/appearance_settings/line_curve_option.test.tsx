/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LineCurveOption } from './line_curve_option';
import { lineCurveDefinitions } from './line_curve_definitions';
import { render, screen } from '@testing-library/react';

describe('Line curve option', () => {
  it.each(lineCurveDefinitions.map((v) => ({ type: v.type, title: v.title })))(
    `should show currently line curve option - %s`,
    ({ type, title }) => {
      render(<LineCurveOption onChange={jest.fn()} value={type} />);
      expect(screen.getByRole('button')).toHaveTextContent(title);
    }
  );

  it('should show line curve option when enabled', () => {
    render(<LineCurveOption onChange={jest.fn()} value={'LINEAR'} enabled={true} />);
    expect(screen.getByTestId('lnsCurveStyleSelect')).toBeInTheDocument();
  });

  it('should hide line curve option when disabled', () => {
    render(<LineCurveOption onChange={jest.fn()} value={'LINEAR'} enabled={false} />);
    expect(screen.queryByTestId('lnsCurveStyleSelect')).not.toBeInTheDocument();
  });
});
