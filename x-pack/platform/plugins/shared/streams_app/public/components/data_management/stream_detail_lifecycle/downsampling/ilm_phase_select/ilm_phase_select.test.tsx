/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiButtonEmpty } from '@elastic/eui';
import { IlmPhaseSelect } from './ilm_phase_select';

jest.mock('../../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF0000', description: 'Hot desc' },
      warm: { color: '#FFA500', description: 'Warm desc' },
      cold: { color: '#0000FF', description: 'Cold desc' },
      frozen: { color: '#00FFFF', description: 'Frozen desc' },
      delete: { color: '#808080', description: 'Delete desc' },
    },
  }),
}));

describe('IlmPhaseSelect', () => {
  it('renders the trigger button label', () => {
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty {...props}>Add data phase and downsampling</EuiButtonEmpty>
        )}
        selectedPhases={[]}
        onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('ilmPhaseSelectButton')).toHaveTextContent(
      'Add data phase and downsampling'
    );
  });

  it('opens the popover and calls onSelect when an option is selected (then closes)', async () => {
    const onSelect = jest.fn();
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty {...props}>Add data phase and downsampling</EuiButtonEmpty>
        )}
        selectedPhases={[]}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId('ilmPhaseSelectButton'));

    expect(screen.getByRole('dialog', { name: 'Add ILM phase popover' })).toBeInTheDocument();
    expect(screen.getByTestId('ilmPhaseSelectOption-cold')).toBeInTheDocument();
    expect(screen.getByTestId('ilmPhaseSelectOption-cold')).toHaveTextContent('Cold desc');
    fireEvent.click(screen.getByTestId('ilmPhaseSelectOption-cold'));

    expect(onSelect).toHaveBeenCalledWith('cold');
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Add ILM phase popover' })
      ).not.toBeInTheDocument()
    );
  });

  it('omits already-selected phases from the list', () => {
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty {...props}>Add data phase and downsampling</EuiButtonEmpty>
        )}
        selectedPhases={['cold']}
        onSelect={() => {}}
        initialIsOpen={true}
      />
    );
    expect(screen.queryByTestId('ilmPhaseSelectOption-cold')).not.toBeInTheDocument();
    expect(screen.getByTestId('ilmPhaseSelectOption-warm')).toBeInTheDocument();
  });

  it('omits excludedPhases from the list', () => {
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty {...props}>Add data phase and downsampling</EuiButtonEmpty>
        )}
        selectedPhases={[]}
        excludedPhases={['frozen', 'delete']}
        onSelect={() => {}}
        initialIsOpen={true}
      />
    );

    expect(screen.queryByTestId('ilmPhaseSelectOption-frozen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ilmPhaseSelectOption-delete')).not.toBeInTheDocument();
    expect(screen.getByTestId('ilmPhaseSelectOption-hot')).toBeInTheDocument();
    expect(screen.getByTestId('ilmPhaseSelectOption-warm')).toBeInTheDocument();
  });

  it('disables the trigger when all phases are already selected', () => {
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty {...props}>Add data phase and downsampling</EuiButtonEmpty>
        )}
        selectedPhases={['hot', 'warm', 'cold', 'frozen', 'delete']}
        onSelect={() => {}}
      />
    );
    expect(screen.getByTestId('ilmPhaseSelectButton')).toBeDisabled();
  });

  it('calls the original button onClick when the trigger is clicked', () => {
    const onClick = jest.fn();
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty
            {...props}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              onClick(e);
              props.onClick(e);
            }}
          >
            Add data phase and downsampling
          </EuiButtonEmpty>
        )}
        selectedPhases={[]}
        onSelect={() => {}}
      />
    );

    const button = screen.getByLabelText('Add ILM phase button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add ILM phase popover' })).toBeInTheDocument();
  });

  it('uses a custom aria-label from the provided button', () => {
    render(
      <IlmPhaseSelect
        renderButton={(props) => (
          <EuiButtonEmpty {...props} aria-label="Custom trigger label">
            Add data phase and downsampling
          </EuiButtonEmpty>
        )}
        selectedPhases={[]}
        onSelect={() => {}}
      />
    );

    expect(screen.getByLabelText('Custom trigger label')).toBeInTheDocument();
  });
});
