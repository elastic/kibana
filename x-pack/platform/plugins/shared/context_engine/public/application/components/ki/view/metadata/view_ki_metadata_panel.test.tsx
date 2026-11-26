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
import { useSelectedKi } from '../../../../hooks/use_selected_ki';
import { ViewKiMetadataPanel } from './view_ki_metadata_panel';

jest.mock('../../../../hooks/use_selected_ki', () => ({
  useSelectedKi: jest.fn(),
}));

const mockUseSelectedKi = jest.mocked(useSelectedKi);

const renderPanel = (document: KiDocument) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={coreMock.createStart()}>
          <ViewKiMetadataPanel kiId="ki-1" document={document} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

beforeEach(() => {
  mockUseSelectedKi.mockReturnValue({
    selectedKi: { kiId: 'ki-1', index: 'idx' },
    selectKi: jest.fn(),
    clearSelectedKi: jest.fn(),
  });
});

describe('ViewKiMetadataPanel', () => {
  it('renders description when present', () => {
    renderPanel({ description: 'Helpful context' });
    expect(screen.getByTestId('contextViewKiDescription')).toHaveTextContent('Helpful context');
  });

  it('renders tags as badges when present', () => {
    renderPanel({ tags: ['alpha', 'beta'] });
    const tagsList = screen.getByTestId('contextViewKiTagsList');
    expect(within(tagsList).getByText('alpha')).toBeInTheDocument();
    expect(within(tagsList).getByText('beta')).toBeInTheDocument();
  });

  it('renders attributes section when document has non-blank attributes', () => {
    renderPanel({
      attributes: {
        region: 'us-east',
      },
    });

    expect(screen.getByTestId('contextViewKiAttributesSection')).toBeInTheDocument();
  });

  it('omits attributes section when attributes are empty', () => {
    renderPanel({ attributes: {} });

    expect(screen.queryByTestId('contextViewKiAttributesSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiMetadataPanel')).toBeInTheDocument();
  });

  it('renders attributes section when attributes object has entries', () => {
    renderPanel({
      attributes: {
        '': 'value',
        keyOnly: '   ',
      },
    });

    expect(screen.getByTestId('contextViewKiAttributesSection')).toBeInTheDocument();
  });

  it('renders references section when document has references', () => {
    renderPanel({
      references: [{ uri: 'ki://ref-1', relation: 'relates_to' }],
    });

    expect(screen.getByTestId('contextViewKiReferencesSection')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiReferenceLink')).toBeInTheDocument();
  });

  it('omits references section when references are empty', () => {
    renderPanel({ references: [] });

    expect(screen.queryByTestId('contextViewKiReferencesSection')).not.toBeInTheDocument();
  });
});
