/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionType } from '@kbn/actions-types';
import { I18nProvider } from '@kbn/i18n-react';
import { ImportSourcePicker } from './import_source_picker';
import { buildImportSources } from './import_sources';

const datadog: ActionType = {
  id: '.datadog',
  name: 'Datadog',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: ['workflows', 'importAlerts'],
  isSystemActionType: false,
  isDeprecated: false,
  isExperimental: true,
};

const renderPicker = (connectorTypes: ActionType[] = [datadog]) => {
  const onSelect = jest.fn();
  render(
    <I18nProvider>
      <ImportSourcePicker sources={buildImportSources(connectorTypes)} onSelect={onSelect} />
    </I18nProvider>
  );
  return { onSelect };
};

describe('ImportSourcePicker', () => {
  it('shows the custom webhook first, then connectors, then coming soon vendors', () => {
    renderPicker();

    const cards = screen.getAllByTestId(/^importsSourceCard-/);
    expect(cards[0]).toHaveAttribute('data-test-subj', 'importsSourceCard-customWebhook');
    expect(cards[0]).toHaveTextContent('Custom webhook');
    expect(cards[1]).toHaveAttribute('data-test-subj', 'importsSourceCard-.datadog');
    expect(cards[1]).toHaveTextContent('Datadog');
    expect(cards[1]).toHaveTextContent('Technical preview');
  });

  it('selects the custom webhook', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker();

    await user.click(screen.getByTestId('importsSourceCard-customWebhook'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: 'custom' }));
  });

  it('selects a connector source', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker();

    await user.click(screen.getByTestId('importsSourceCard-.datadog'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'connector', id: '.datadog' })
    );
  });

  it('marks coming soon vendors and does not let them be picked', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker();

    expect(screen.getByTestId('importsSourceBadge-zabbix-comingSoon')).toHaveTextContent(
      'Coming soon'
    );
    await user.click(screen.getByTestId('importsSourceCard-zabbix'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables a connector source the license does not cover', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker([{ ...datadog, enabledInLicense: false }]);

    expect(screen.getByTestId('importsSourceBadge-.datadog-license')).toBeInTheDocument();
    await user.click(screen.getByTestId('importsSourceCard-.datadog'));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('offers a search once the catalog is long, and filters by it', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(screen.getByTestId('importsSourceSearch'), 'graf');

    expect(screen.getAllByTestId(/^importsSourceCard-/)).toHaveLength(1);
    expect(screen.getByTestId('importsSourceCard-grafana')).toBeInTheDocument();
  });

  it('says so when the search matches nothing', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(screen.getByTestId('importsSourceSearch'), 'nothing like this');

    expect(screen.getByTestId('importsSourceNoMatches')).toBeInTheDocument();
  });
});
