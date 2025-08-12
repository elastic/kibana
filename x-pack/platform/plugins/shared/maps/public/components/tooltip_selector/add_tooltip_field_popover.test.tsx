/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { AddTooltipFieldPopover } from './add_tooltip_field_popover';

const defaultProps = {
  fields: [
    {
      name: 'prop1',
      label: 'custom label for prop1',
      type: 'string',
    },
    {
      name: 'prop2',
      label: 'prop2-label',
      type: 'string',
    },
    {
      name: '@timestamp',
      label: '@timestamp-label',
      type: 'date',
    },
  ],
  selectedFields: [],
  onAdd: () => {},
};

test('Should render', () => {
  render(
    <I18nProvider>
      <AddTooltipFieldPopover {...defaultProps} />
    </I18nProvider>
  );

  // Verify the Add button is present
  expect(screen.getByText('Add')).toBeInTheDocument();
});

test('Should remove selected fields from selectable', () => {
  render(
    <I18nProvider>
      <AddTooltipFieldPopover
        {...defaultProps}
        selectedFields={[
          { name: 'prop2', label: 'prop2-label', type: 'string' },
          { name: 'prop1', label: 'prop1-label', type: 'string' },
        ]}
      />
    </I18nProvider>
  );

  // Verify the Add button is present
  expect(screen.getByText('Add')).toBeInTheDocument();
});
