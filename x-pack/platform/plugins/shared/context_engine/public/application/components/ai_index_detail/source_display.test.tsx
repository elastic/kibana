/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { getSourceDisplay, type SourceDisplayDeps } from './source_display';

const emptyDeps: SourceDisplayDeps = {
  connectorNameById: new Map(),
  connectorActionTypeById: new Map(),
  connectorTypeNameById: new Map(),
};

const connectorDeps: SourceDisplayDeps = {
  connectorNameById: new Map([['connector-1', 'Jira Cloud']]),
  connectorActionTypeById: new Map([['connector-1', '.jira']]),
  connectorTypeNameById: new Map([['connector-1', 'Jira']]),
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('getSourceDisplay', () => {
  it('uses connectorTypeNameById for the connector type label', () => {
    const display = getSourceDisplay('connector', 'connector-1', connectorDeps);

    expect(display.typeLabel).toBe('Jira');
    expect(display.label).toBe('Jira Cloud');
  });

  it('falls back to Connector when connectorTypeNameById has no entry', () => {
    const display = getSourceDisplay('connector', 'connector-1', {
      ...connectorDeps,
      connectorTypeNameById: new Map(),
    });

    expect(display.typeLabel).toBe('Connector');
    expect(display.label).toBe('Jira Cloud');
  });

  it('returns ES|QL content for display', () => {
    const query = 'FROM logs-* | LIMIT 10';
    const display = getSourceDisplay('esql', query, emptyDeps);

    expect(display.label).toBe(query);
    expect(display.typeLabel).toBe('ES|QL');

    renderWithProviders(<div data-test-subj="esqlContent">{display.content}</div>);
    const code = screen.getByTestId('esqlContent').querySelector('code');
    expect(code).toHaveTextContent(query);
  });
});
