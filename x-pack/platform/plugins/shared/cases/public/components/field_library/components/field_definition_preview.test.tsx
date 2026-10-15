/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../../common/mock';
import { FieldDefinitionPreview } from './field_definition_preview';

const DEFINITION = `name: impact
control: INPUT_TEXT
label: Untitled field
type: keyword
`;

describe('FieldDefinitionPreview', () => {
  it('renders requirement and hidden-state notes without hiding the control', () => {
    renderWithTestingProviders(
      <FieldDefinitionPreview
        definition={DEFINITION}
        onDefaultChange={() => undefined}
        requirementBadge="Required"
        hiddenNote="Hidden until summary equals high"
      />
    );

    expect(screen.getByTestId('fieldDefinitionPreview-requirementBadge')).toHaveTextContent(
      'Required'
    );
    expect(screen.getByTestId('fieldDefinitionPreview-hiddenNote')).toHaveTextContent(
      'Hidden until summary equals high'
    );
    expect(screen.getByText('Untitled field')).toBeInTheDocument();
  });

  it('renders required_on_close as such instead of forcing Required', () => {
    renderWithTestingProviders(
      <FieldDefinitionPreview
        definition={`${DEFINITION}validation:\n  required_on_close: true\n`}
        onDefaultChange={() => undefined}
        requirementBadge="Required on close"
      />
    );

    expect(screen.getByTestId('form-required-on-close-field-label')).toBeInTheDocument();
    expect(screen.queryByTestId('form-optional-field-label')).not.toBeInTheDocument();
  });

  it('keeps an unconditional requirement as Required', () => {
    renderWithTestingProviders(
      <FieldDefinitionPreview
        definition={`${DEFINITION}validation:\n  required: true\n`}
        onDefaultChange={() => undefined}
        requirementBadge="Required"
      />
    );

    expect(screen.queryByTestId('form-required-on-close-field-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-optional-field-label')).not.toBeInTheDocument();
  });
});
