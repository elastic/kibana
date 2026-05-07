/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { labels } from '../../../utils/i18n';
import { PluginAddMenuPanel } from './plugin_add_menu_panel';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('PluginAddMenuPanel', () => {
  it('calls onInstallFromUrlOrZip when the URL/ZIP item is clicked', async () => {
    const user = userEvent.setup();
    const onInstallFromUrlOrZip = jest.fn();
    const onAddFromLibrary = jest.fn();

    renderWithIntl(
      <PluginAddMenuPanel
        onInstallFromUrlOrZip={onInstallFromUrlOrZip}
        onAddFromLibrary={onAddFromLibrary}
      />
    );

    await user.click(screen.getByText(labels.agentPlugins.fromUrlOrZipMenuItem));
    expect(onInstallFromUrlOrZip).toHaveBeenCalledTimes(1);
    expect(onAddFromLibrary).not.toHaveBeenCalled();
  });

  it('calls onAddFromLibrary when the library item is clicked', async () => {
    const user = userEvent.setup();
    const onInstallFromUrlOrZip = jest.fn();
    const onAddFromLibrary = jest.fn();

    renderWithIntl(
      <PluginAddMenuPanel
        onInstallFromUrlOrZip={onInstallFromUrlOrZip}
        onAddFromLibrary={onAddFromLibrary}
      />
    );

    await user.click(screen.getByText(labels.agentPlugins.fromLibraryMenuItem));
    expect(onAddFromLibrary).toHaveBeenCalledTimes(1);
    expect(onInstallFromUrlOrZip).not.toHaveBeenCalled();
  });
});
