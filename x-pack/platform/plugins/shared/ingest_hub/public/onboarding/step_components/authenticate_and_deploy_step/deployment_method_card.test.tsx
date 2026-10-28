/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { DeploymentMethodCard } from './deployment_method_card';

type Props = React.ComponentProps<typeof DeploymentMethodCard>;

function renderCard(props: Partial<Props> = {}) {
  const onChange = props.onChange ?? jest.fn();
  render(
    <I18nProvider>
      <DeploymentMethodCard selectedMethod="managed_integration" {...props} onChange={onChange} />
    </I18nProvider>
  );
  return { onChange };
}

// The test subject lands on the radio wrapper, so reach for the input inside it.
const input = (method: string) =>
  screen.getByTestId(`deploymentMethodCard-${method}`).querySelector('input') as HTMLInputElement;

describe('DeploymentMethodCard', () => {
  it('renders both methods with help text, Managed Integration marked Recommended', () => {
    renderCard();
    expect(screen.getByText('Elastic Managed Integration')).toBeInTheDocument();
    expect(screen.getByText('Best for simple setup.')).toBeInTheDocument();
    expect(screen.getByText('Agent-based')).toBeInTheDocument();
    expect(screen.getByText('Best if you need more control.')).toBeInTheDocument();
    const recommended = screen.getAllByText('Recommended');
    expect(recommended).toHaveLength(1);
    expect(recommended[0].closest('.euiCheckableCard')?.textContent).toContain(
      'Elastic Managed Integration'
    );
  });

  it('checks the card matching selectedMethod', () => {
    renderCard({ selectedMethod: 'agent_based' });
    expect(input('agent_based').checked).toBe(true);
    expect(input('managed_integration').checked).toBe(false);
  });

  it('calls onChange immediately when another card is picked', () => {
    const { onChange } = renderCard();
    fireEvent.click(input('agent_based'));
    expect(onChange).toHaveBeenCalledWith('agent_based');
    expect(screen.queryByTestId('confirmDeploymentMethodModal')).not.toBeInTheDocument();
  });

  describe('unsupportedServices', () => {
    const unsupportedServices = {
      agent_based: [{ id: 'cloudtrail_otel', name: 'AWS CloudTrail' } as AwsServiceMatrixEntry],
    };

    it('asks for confirmation before switching to a method that removes services', () => {
      const { onChange } = renderCard({ unsupportedServices });
      fireEvent.click(input('agent_based'));
      expect(onChange).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('confirmDeploymentMethodModal-removedServicesCallout').textContent
      ).toContain('AWS CloudTrail');
    });

    it('Cancel closes the modal without calling onChange', () => {
      const { onChange } = renderCard({ unsupportedServices });
      fireEvent.click(input('agent_based'));
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
      expect(screen.queryByTestId('confirmDeploymentMethodModal')).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Confirm calls onChange with the pending method and closes the modal', () => {
      const { onChange } = renderCard({ unsupportedServices });
      fireEvent.click(input('agent_based'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      expect(onChange).toHaveBeenCalledWith('agent_based');
      expect(screen.queryByTestId('confirmDeploymentMethodModal')).not.toBeInTheDocument();
    });
  });

  describe('switchResetsSettings', () => {
    it('asks for confirmation before any switch, saying the settings are reset', () => {
      const { onChange } = renderCard({ switchResetsSettings: true });
      fireEvent.click(input('agent_based'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('confirmDeploymentMethodModal-resetSettings')).toHaveTextContent(
        'resets the agent policy settings'
      );
      expect(
        screen.queryByTestId('confirmDeploymentMethodModal-removedServicesCallout')
      ).not.toBeInTheDocument();
    });

    it('applies the switch after the confirmation', () => {
      const { onChange } = renderCard({ switchResetsSettings: true });
      fireEvent.click(input('agent_based'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      expect(onChange).toHaveBeenCalledWith('agent_based');
    });

    it('keeps the current method when the confirmation is cancelled', () => {
      const { onChange } = renderCard({ switchResetsSettings: true });
      fireEvent.click(input('agent_based'));
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows both warnings when services would also be removed', () => {
      renderCard({
        switchResetsSettings: true,
        unsupportedServices: {
          agent_based: [{ id: 'cloudtrail_otel', name: 'AWS CloudTrail' } as AwsServiceMatrixEntry],
        },
      });
      fireEvent.click(input('agent_based'));
      expect(screen.getByTestId('confirmDeploymentMethodModal-resetSettings')).toBeInTheDocument();
      expect(
        screen.getByTestId('confirmDeploymentMethodModal-removedServicesCallout')
      ).toHaveTextContent('AWS CloudTrail');
    });
  });

  describe('availableMethods', () => {
    it('only renders the listed methods', () => {
      renderCard({ selectedMethod: 'agent_based', availableMethods: ['agent_based'] });
      expect(screen.getByTestId('deploymentMethodCard-agent_based')).toBeInTheDocument();
      expect(screen.queryByTestId('deploymentMethodCard-managed_integration')).toBeNull();
    });

    it('checks the restricted method when the selection is outside the list', () => {
      // A stale persisted 'managed_integration' must not leave every card unchecked on a
      // deployment where only agent_based is offered.
      renderCard({ selectedMethod: 'managed_integration', availableMethods: ['agent_based'] });
      expect(input('agent_based').checked).toBe(true);
    });
  });

  it('disables the cards when locked', () => {
    renderCard({ selectedMethod: 'agent_based', locked: true });
    expect(input('agent_based')).toBeDisabled();
    expect(input('managed_integration')).toBeDisabled();
  });

  it('disables the cards and does not call onChange when disabled', () => {
    const { onChange } = renderCard({ disabled: true });
    expect(input('agent_based')).toBeDisabled();
    fireEvent.click(input('agent_based'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
