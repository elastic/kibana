/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { SharedSettingsSection } from './shared_settings_section';

const renderSection = (props: Partial<React.ComponentProps<typeof SharedSettingsSection>> = {}) => {
  const onIntegrationNameChange = jest.fn();
  const onDescriptionChange = jest.fn();
  render(
    <I18nProvider>
      <SharedSettingsSection
        integrationName="aws-1"
        onIntegrationNameChange={onIntegrationNameChange}
        description=""
        onDescriptionChange={onDescriptionChange}
        globalRegion="us-east-1"
        onGlobalRegionChange={jest.fn()}
        globalRegionTouched={false}
        onGlobalRegionTouched={jest.fn()}
        {...props}
      />
    </I18nProvider>
  );
  return {
    onIntegrationNameChange,
    onDescriptionChange,
  };
};

describe('SharedSettingsSection', () => {
  it('shows the integration name and the description', () => {
    renderSection({ integrationName: 'my-aws', description: 'Production' });

    expect(screen.getByTestId('sharedSettingsIntegrationName')).toHaveValue('my-aws');
    expect(screen.getByTestId('sharedSettingsDescription')).toHaveValue('Production');
  });

  it('reports edits', () => {
    const { onIntegrationNameChange, onDescriptionChange } = renderSection();

    fireEvent.change(screen.getByTestId('sharedSettingsIntegrationName'), {
      target: { value: 'my-aws' },
    });
    fireEvent.change(screen.getByTestId('sharedSettingsDescription'), {
      target: { value: 'Production' },
    });

    expect(onIntegrationNameChange).toHaveBeenCalledWith('my-aws');
    expect(onDescriptionChange).toHaveBeenCalledWith('Production');
  });

  it('shows no error on a field that was not edited', () => {
    renderSection({
      integrationName: '',
      integrationNameError: 'An integration name is required.',
    });

    expect(screen.queryByText('An integration name is required.')).not.toBeInTheDocument();
  });

  it('shows the error once the field was edited', () => {
    renderSection({
      integrationName: '',
      integrationNameError: 'An integration name is required.',
    });

    fireEvent.change(screen.getByTestId('sharedSettingsIntegrationName'), {
      target: { value: ' ' },
    });

    expect(screen.getByText('An integration name is required.')).toBeInTheDocument();
  });
});
