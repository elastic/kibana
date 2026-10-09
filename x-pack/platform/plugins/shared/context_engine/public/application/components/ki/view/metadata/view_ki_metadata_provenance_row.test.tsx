/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { KiMetadataProvenanceRow } from './view_ki_metadata_provenance_row';

const getUrlForApp = (appId: string, options?: { path?: string }) =>
  `/app/${appId}${options?.path ?? ''}`;

const renderProvenanceRow = (props: React.ComponentProps<typeof KiMetadataProvenanceRow>) => {
  const services = coreMock.createStart();
  jest.spyOn(services.application, 'getUrlForApp').mockImplementation(getUrlForApp);

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <KiMetadataProvenanceRow {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('KiMetadataProvenanceRow', () => {
  it('renders timestamp only', () => {
    const { container } = renderProvenanceRow({ at: '2026-01-15T12:00:00.000Z' });
    expect(container.querySelector('span[tabindex="0"]')).toBeInTheDocument();
    expect(screen.queryByText(/by/)).not.toBeInTheDocument();
  });

  it('renders writer only', () => {
    renderProvenanceRow({
      writer: { uri: 'workflow://some-id', metadata: {} },
    });
    expect(screen.getByRole('link', { name: 'some-id' })).toHaveAttribute(
      'href',
      '/app/workflows/some-id'
    );
  });

  it('renders timestamp and writer together', () => {
    const { container } = renderProvenanceRow({
      at: '2026-01-15T12:00:00.000Z',
      writer: { uri: 'workflow://some-id', metadata: {} },
    });
    expect(within(container).getByText(/by/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'some-id' })).toBeInTheDocument();
  });

  it('renders updated-style timestamp without writer', () => {
    const { container } = renderProvenanceRow({ at: '2026-02-01T08:30:00.000Z' });
    expect(container.querySelector('span[tabindex="0"]')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders updated-style writer only', () => {
    renderProvenanceRow({
      writer: { uri: 'workflow://updated-wf', metadata: {} },
    });
    expect(screen.getByRole('link', { name: 'updated-wf' })).toHaveAttribute(
      'href',
      '/app/workflows/updated-wf'
    );
  });
});
