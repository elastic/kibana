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
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { ViewKiMetadataSection } from './view_ki_metadata_section';

const getUrlForApp = (appId: string, options?: { path?: string }) =>
  `/app/${appId}${options?.path ?? ''}`;

const renderSection = (kiId: string, document: KiDocument) => {
  const services = coreMock.createStart();
  jest.spyOn(services.application, 'getUrlForApp').mockImplementation(getUrlForApp);

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <ViewKiMetadataSection kiId={kiId} document={document} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const getMetadataDescription = (label: string): HTMLElement => {
  const list = screen.getByTestId('contextViewKiMetadataList');
  const term = within(list).getByText(label, { selector: 'dt' });
  const description = term.nextElementSibling;
  if (!description) {
    throw new Error(`Missing metadata row for ${label}`);
  }
  return description as HTMLElement;
};

describe('ViewKiMetadataSection', () => {
  it('renders description when present', () => {
    renderSection('ki-1', { description: 'Helpful context' });

    expect(screen.getByTestId('contextViewKiDescription')).toHaveTextContent('Helpful context');
  });

  it('renders tags as badges when present', () => {
    renderSection('ki-1', { tags: ['alpha', 'beta'] });

    const tagsList = screen.getByTestId('contextViewKiTagsList');
    expect(within(tagsList).getByText('alpha')).toBeInTheDocument();
    expect(within(tagsList).getByText('beta')).toBeInTheDocument();
  });

  describe('Created metadata row', () => {
    it('renders timestamp only', () => {
      renderSection('ki-1', { '@timestamp': '2026-01-15T12:00:00.000Z' });

      const description = getMetadataDescription('Created');
      expect(description.querySelector('span[tabindex="0"]')).toBeInTheDocument();
      expect(within(description).queryByText(/by/)).not.toBeInTheDocument();
      expect(within(description).queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders writer only', () => {
      renderSection('ki-1', {
        governance: { provenance: { created_by: 'workflow://some-id' } },
      });

      const description = getMetadataDescription('Created');
      expect(within(description).getByText(/by/)).toBeInTheDocument();
      expect(within(description).getByRole('link', { name: 'some-id' })).toHaveAttribute(
        'href',
        '/app/workflows/some-id'
      );
    });

    it('renders timestamp and writer together', () => {
      renderSection('ki-1', {
        '@timestamp': '2026-01-15T12:00:00.000Z',
        governance: { provenance: { created_by: 'workflow://some-id' } },
      });

      const description = getMetadataDescription('Created');
      expect(within(description).getByText(/by/)).toBeInTheDocument();
      expect(within(description).getByRole('link', { name: 'some-id' })).toBeInTheDocument();
    });
  });

  describe('Updated metadata row', () => {
    it('renders timestamp only', () => {
      renderSection('ki-1', { updated_at: '2026-02-01T08:30:00.000Z' });

      const description = getMetadataDescription('Updated');
      expect(description.querySelector('span[tabindex="0"]')).toBeInTheDocument();
      expect(within(description).queryByText(/by/)).not.toBeInTheDocument();
      expect(within(description).queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders writer only', () => {
      renderSection('ki-1', {
        governance: { provenance: { updated_by: 'workflow://updated-wf' } },
      });

      const description = getMetadataDescription('Updated');
      expect(within(description).getByText(/by/)).toBeInTheDocument();
      expect(within(description).getByRole('link', { name: 'updated-wf' })).toHaveAttribute(
        'href',
        '/app/workflows/updated-wf'
      );
    });

    it('renders timestamp and writer together', () => {
      renderSection('ki-1', {
        updated_at: '2026-02-01T08:30:00.000Z',
        governance: { provenance: { updated_by: 'workflow://updated-wf' } },
      });

      const description = getMetadataDescription('Updated');
      expect(within(description).getByText(/by/)).toBeInTheDocument();
      expect(within(description).getByRole('link', { name: 'updated-wf' })).toBeInTheDocument();
    });
  });
});
