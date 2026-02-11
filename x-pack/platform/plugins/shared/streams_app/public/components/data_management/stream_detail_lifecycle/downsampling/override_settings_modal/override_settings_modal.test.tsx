/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { OverrideSettingsModal } from './override_settings_modal';

describe('OverrideSettingsModal', () => {
  it('renders title and body text', () => {
    renderWithI18n(<OverrideSettingsModal onCancel={() => {}} onSave={() => {}} />);

    expect(screen.getByTestId('createPolicyModalTitle')).toHaveTextContent(
      'This will override index template settings'
    );
    expect(
      screen.getByText(
        'This stream is currently configured to inherit retention and downsampling from an index template. By making this change, you will no longer be inheriting those settings and your changes will be applied to this stream alone. Are you sure you wish to proceed?'
      )
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderWithI18n(<OverrideSettingsModal onCancel={onCancel} onSave={() => {}} />);

    fireEvent.click(screen.getByTestId('overrideSettingsModal-cancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onSave when override button is clicked', () => {
    const onSave = jest.fn();
    renderWithI18n(<OverrideSettingsModal onCancel={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('overrideSettingsModal-overrideButton'));
    expect(onSave).toHaveBeenCalled();
  });
});
