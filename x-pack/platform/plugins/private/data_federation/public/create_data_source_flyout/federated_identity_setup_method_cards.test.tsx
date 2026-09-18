/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';

import type { FederatedIdentitySetupMethodOption } from './federated_identity_setup_method_cards';
import { FederatedIdentitySetupMethodCards } from './federated_identity_setup_method_cards';

const options: FederatedIdentitySetupMethodOption[] = [
  { id: 'cloudformation', label: 'CloudFormation', icon: 'logoAWS' },
  { id: 'manual', label: 'Manual', icon: 'consoleApp' },
];

const renderCards = (onMethodChange = jest.fn()) => {
  render(
    <EuiProvider>
      <FederatedIdentitySetupMethodCards
        options={options}
        selectedMethod="cloudformation"
        onMethodChange={onMethodChange}
        testSubjPrefix="testPrefix"
      />
    </EuiProvider>
  );

  return onMethodChange;
};

describe('FederatedIdentitySetupMethodCards', () => {
  // Only one method applies at a time, so the cards behave as a single radio group.
  it('marks the selected method and leaves the other unchecked', () => {
    renderCards();

    expect(screen.getByRole('radio', { name: /CloudFormation/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Manual/ })).not.toBeChecked();
  });

  it('reports the method the user picks', () => {
    const onMethodChange = renderCards();

    fireEvent.click(screen.getByRole('radio', { name: /Manual/ }));

    expect(onMethodChange).toHaveBeenCalledWith('manual');
  });
});
