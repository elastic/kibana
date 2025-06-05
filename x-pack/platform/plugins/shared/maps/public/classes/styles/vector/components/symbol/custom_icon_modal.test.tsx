/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { CustomIconModal } from './custom_icon_modal';

jest.mock('../../../../../kibana_services', () => ({
  getUsageCollection: () => {
    return {
      reportUiCounter: () => {},
    };
  },
}));

jest.mock('./icon_preview', () => ({ IconPreview: () => <div data-test-subj="iconPreview" /> }));

const defaultProps = {
  cutoff: 0.25,
  onCancel: () => {},
  onSave: () => {},
  radius: 0.25,
  title: 'Custom Icon',
};

test('should render an empty custom icon modal', () => {
  render(<CustomIconModal {...defaultProps} />);
  const header = screen.getByRole('heading', { name: 'Custom Icon' });
  expect(header).toHaveTextContent('Custom Icon');
  expect(screen.getByRole('dialog')).toHaveTextContent(`Select or drag and drop an SVG icon`);

  // Check if modal dialog is present
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();

  // Check for file picker prompt text
  expect(screen.getByText(/select or drag and drop an svg icon/i)).toBeInTheDocument();

  // Check for help text
  expect(
    screen.getByText(/SVGs without sharp corners and intricate details work best/i)
  ).toBeInTheDocument();

  // Check for disabled Save button
  const saveButton = screen.getByRole('button', { name: /save/i });
  expect(saveButton).toBeDisabled();

  // Check for Cancel button
  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  expect(cancelButton).toBeInTheDocument();
});

test('should render a custom icon modal with an existing icon', () => {
  const customTitle = faker.string.alpha(10);
  render(
    <CustomIconModal
      {...defaultProps}
      cutoff={0.3}
      label="square"
      onDelete={() => {}}
      radius={0.15}
      svg='<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>'
      symbolId="__kbn__custom_icon_sdf__foobar"
      title={customTitle}
    />
  );

  // Modal header has custom title
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(customTitle);

  // Name input has pre-filled value
  expect(screen.getByTestId('mapsCustomIconForm-label')).toHaveValue('square');

  // Save button should not be disabled
  expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();

  // Advanced options accordion is rendered
  expect(screen.getByText('Advanced options')).toBeInTheDocument();

  // Reset button in advanced options
  expect(screen.getByText('Reset')).toBeInTheDocument();

  // Optional: Check range inputs by label or value
  expect(screen.getByLabelText('Alpha threshold')).toBeInTheDocument();
  expect(screen.getByLabelText('Radius')).toBeInTheDocument();
});
