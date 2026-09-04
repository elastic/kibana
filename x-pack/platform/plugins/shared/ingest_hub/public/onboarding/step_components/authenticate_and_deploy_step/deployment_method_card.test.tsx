/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DeploymentMethodCard } from './deployment_method_card';

function renderCard(props: { onChange?: jest.Mock } = {}) {
  const onChange = props.onChange ?? jest.fn();
  render(
    <I18nProvider>
      <DeploymentMethodCard selectedMethod="managed_integration" onChange={onChange} />
    </I18nProvider>
  );
  return { onChange };
}

describe('DeploymentMethodCard', () => {
  it('renders current method name and tagline', () => {
    renderCard();
    expect(screen.getByText('Elastic Managed Integration.')).toBeInTheDocument();
    expect(screen.getByText('Simpler setup, no agent required.')).toBeInTheDocument();
  });

  it('Edit button opens modal', () => {
    renderCard();
    expect(screen.queryByTestId('editDeploymentMethodModal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('deploymentMethodCard-editButton'));
    expect(screen.getByTestId('editDeploymentMethodModal')).toBeInTheDocument();
  });

  it('Cancel closes modal without calling onChange', () => {
    const { onChange } = renderCard();
    fireEvent.click(screen.getByTestId('deploymentMethodCard-editButton'));
    fireEvent.click(screen.getByTestId('editDeploymentMethodModal-cancelButton'));
    expect(screen.queryByTestId('editDeploymentMethodModal')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Save calls onChange with selected method and closes modal', () => {
    const { onChange } = renderCard();
    fireEvent.click(screen.getByTestId('deploymentMethodCard-editButton'));
    fireEvent.click(screen.getByTestId('editDeploymentMethodModal-saveButton'));
    expect(onChange).toHaveBeenCalledWith('managed_integration');
    expect(screen.queryByTestId('editDeploymentMethodModal')).not.toBeInTheDocument();
  });
});
