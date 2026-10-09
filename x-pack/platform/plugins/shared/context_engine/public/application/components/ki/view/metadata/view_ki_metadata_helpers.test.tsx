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
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { buildKiMetadataListItems } from './view_ki_metadata_helpers';
import type { KiGovernanceView } from './view_ki_document_helpers';

const renderItems = (kiId: string, document: KiDocument, governance: KiGovernanceView = {}) => {
  const items = buildKiMetadataListItems(kiId, document, governance);
  const services = coreMock.createStart();
  jest
    .spyOn(services.application, 'getUrlForApp')
    .mockImplementation(
      (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
    );

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <ul>
            {items.map((item) => (
              <li key={item.title}>
                <span data-test-subj={`title-${item.title}`}>{item.title}</span>
                <div data-test-subj={`desc-${item.title}`}>{item.description}</div>
              </li>
            ))}
          </ul>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('buildKiMetadataListItems', () => {
  it('returns only ID for a minimal document', () => {
    renderItems('ki-abc', {});
    expect(screen.getByTestId('title-ID')).toHaveTextContent('ID');
    expect(screen.getByTestId('desc-ID')).toHaveTextContent('ki-abc');
    expect(screen.queryByTestId('title-Description')).not.toBeInTheDocument();
  });

  it('includes description when present', () => {
    renderItems('ki-1', { description: 'Helpful context' });
    expect(screen.getByTestId('contextViewKiDescription')).toHaveTextContent('Helpful context');
  });

  it('includes created row when timestamp is set', () => {
    renderItems('ki-1', { '@timestamp': '2026-01-15T12:00:00.000Z' });
    expect(screen.getByTestId('title-Created')).toBeInTheDocument();
  });

  it('includes created row when createdBy is set', () => {
    renderItems('ki-1', {}, { createdBy: { uri: 'workflow://wf-1', metadata: {} } });
    expect(screen.getByTestId('title-Created')).toBeInTheDocument();
  });

  it('includes updated row when updated_at or updatedBy is set', () => {
    renderItems('ki-1', { updated_at: '2026-02-01T08:00:00.000Z' });
    expect(screen.getByTestId('title-Updated')).toBeInTheDocument();
  });

  it('includes expires at when set', () => {
    renderItems('ki-1', { expires_at: '2027-01-01T00:00:00.000Z' });
    expect(screen.getByTestId('title-Expires at')).toBeInTheDocument();
  });

  it('renders tags as badges when present', () => {
    renderItems('ki-1', { tags: ['alpha', 'beta'] });
    const tagsList = screen.getByTestId('contextViewKiTagsList');
    expect(within(tagsList).getByText('alpha')).toBeInTheDocument();
    expect(within(tagsList).getByText('beta')).toBeInTheDocument();
  });

  it('omits optional rows when data is absent', () => {
    renderItems('ki-1', {});
    expect(screen.queryByTestId('contextViewKiTagsList')).not.toBeInTheDocument();
    expect(screen.queryByTestId('title-Expires at')).not.toBeInTheDocument();
  });
});
