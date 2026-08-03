/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { FieldName } from './field_name';

const timestampFieldId = '@timestamp';

const defaultProps = {
  fieldId: timestampFieldId,
};

describe('FieldName', () => {
  test('it renders the field name', () => {
    render(<FieldName {...defaultProps} />);

    expect(screen.getByTestId(`field-${timestampFieldId}-name`)).toHaveTextContent(
      timestampFieldId
    );
  });

  test('it highlights the text specified by the `highlight` prop', () => {
    const highlight = 'stamp';

    render(<FieldName {...{ ...defaultProps, highlight }} />);

    expect(screen.getByText(highlight, { selector: 'mark' })).toHaveTextContent(highlight);
  });
});
