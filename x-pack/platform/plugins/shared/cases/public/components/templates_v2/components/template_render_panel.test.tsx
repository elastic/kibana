/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateRenderPanel } from './template_render_panel';

jest.mock('./template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="mock-preview" />,
}));
jest.mock('./template_settings_form', () => ({
  TemplateSettingsForm: () => <div data-test-subj="mock-settings" />,
}));

describe('TemplateRenderPanel', () => {
  const props = {
    onSettingsChange: jest.fn(),
    onConnectorChange: jest.fn(),
  };

  it('renders the Fields tab by default', () => {
    render(<TemplateRenderPanel {...props} />);

    expect(screen.getByTestId('mock-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-settings')).not.toBeInTheDocument();
  });

  it('switches to the Settings tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TemplateRenderPanel {...props} />);

    await user.click(screen.getByTestId('templateRenderPanelTab-settings'));

    expect(screen.getByTestId('mock-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-preview')).not.toBeInTheDocument();
  });

  it('switches back to the Fields tab', async () => {
    const user = userEvent.setup();
    render(<TemplateRenderPanel {...props} />);

    await user.click(screen.getByTestId('templateRenderPanelTab-settings'));
    await user.click(screen.getByTestId('templateRenderPanelTab-fields'));

    expect(screen.getByTestId('mock-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-settings')).not.toBeInTheDocument();
  });
});
