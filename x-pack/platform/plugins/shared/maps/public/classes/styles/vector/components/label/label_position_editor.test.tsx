/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { LABEL_POSITIONS } from '../../../../../../common/constants';
import { LabelPositionEditor } from './label_position_editor';
import { LabelPositionProperty } from '../../properties/label_position_property';

const defaultProps = {
  handlePropertyChange: () => {},
  hasLabel: true,
  styleProperty: {
    isDisabled: () => {
      return false;
    },
    getOptions: () => {
      return {
        position: LABEL_POSITIONS.TOP,
      };
    },
  } as unknown as LabelPositionProperty,
};

test('should render', () => {
  render(
    <I18nProvider>
      <LabelPositionEditor {...defaultProps} />
    </I18nProvider>
  );

  // Verify the form label is present
  expect(screen.getByText('Label position')).toBeInTheDocument();
  
  // Verify the select has the correct value
  const select = screen.getByLabelText('Select label position');
  expect(select).toHaveValue('TOP');
  expect(select).not.toBeDisabled();
  
  // Verify all options are available in the select
  expect(screen.getByRole('option', { name: 'Top' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Center' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Bottom' })).toBeInTheDocument();
});

test('should render as disabled when label is not set', () => {
  render(
    <I18nProvider>
      <LabelPositionEditor {...defaultProps} hasLabel={false} />
    </I18nProvider>
  );

  // Verify the form label is present
  expect(screen.getByText('Label position')).toBeInTheDocument();
  
  // Verify the select is disabled
  const select = screen.getByLabelText('Select label position');
  expect(select).toBeDisabled();
  
  // Tooltip content is hidden, so just verify the component renders with disabled tooltip
  const tooltip = document.querySelector('.euiToolTipAnchor');
  expect(tooltip).toBeInTheDocument();
});

test('should render as disabled when label position is disabled', () => {
  const disabledLabelPosition = {
    isDisabled: () => {
      return true;
    },
    getOptions: () => {
      return {
        position: LABEL_POSITIONS.TOP,
      };
    },
    getDisabledReason: () => {
      return 'simulated disabled error';
    },
  } as unknown as LabelPositionProperty;
  
  render(
    <I18nProvider>
      <LabelPositionEditor {...defaultProps} styleProperty={disabledLabelPosition} />
    </I18nProvider>
  );

  // Verify the form label is present
  expect(screen.getByText('Label position')).toBeInTheDocument();
  
  // Verify the select is disabled
  const select = screen.getByLabelText('Select label position');
  expect(select).toBeDisabled();
  
  // Tooltip content is hidden, so just verify the component renders with disabled tooltip
  const tooltip = document.querySelector('.euiToolTipAnchor');
  expect(tooltip).toBeInTheDocument();
});
