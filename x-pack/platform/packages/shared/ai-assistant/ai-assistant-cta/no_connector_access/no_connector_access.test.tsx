/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NoConnectorAccess } from './no_connector_access';
import { translations } from './no_connector_access.translations';
import { translations as defaultTranslations } from '../call_to_action.translations';
import { EuiThemeProvider } from '@elastic/eui';

describe('NoConnectorAccess', () => {
  it('renders the callout with the correct title and description', () => {
    const { getByText } = render(<NoConnectorAccess />, { wrapper: EuiThemeProvider });

    expect(getByText(translations.panelTitle)).toBeDefined();
    expect(getByText(translations.panelDescription)).toBeDefined();
    expect(getByText(defaultTranslations.description)).toBeDefined();
  });
});
