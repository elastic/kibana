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
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { useSelectedKi } from '../../../../hooks/use_selected_ki';
import { groupKiReferences } from './view_ki_document_helpers';
import { ViewKiReferencesSection } from './view_ki_references_section';

const mockSelectKi = jest.fn();

jest.mock('../../../../hooks/use_selected_ki', () => ({
  useSelectedKi: jest.fn(),
}));

const mockUseSelectedKi = jest.mocked(useSelectedKi);

const renderSection = (document: KiDocument) => {
  const services = coreMock.createStart();
  jest
    .spyOn(services.application, 'getUrlForApp')
    .mockImplementation((appId, options) => `/app/${appId}${options?.path ?? ''}`);

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <ViewKiReferencesSection groups={groupKiReferences(document.references)} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ViewKiReferencesSection', () => {
  beforeEach(() => {
    mockSelectKi.mockReset();
    mockUseSelectedKi.mockReturnValue({
      selectedKi: { kiId: 'current', index: 'my-index' },
      selectKi: mockSelectKi,
      clearSelectedKi: jest.fn(),
    });
  });

  it('renders derived_from ki sources as links and hides sources it cannot open', () => {
    renderSection({
      references: [
        { uri: 'trace://t1', relation: 'derived_from' },
        { uri: 'ki://m1', relation: 'derived_from' },
      ],
    });

    const list = screen.getByTestId('contextViewKiReferencesList');
    expect(within(list).getByText('Created from')).toBeInTheDocument();
    expect(within(list).queryByText('trace://t1')).not.toBeInTheDocument();

    fireEvent.click(within(list).getByTestId('contextViewKiReferenceLink'));
    expect(mockSelectKi).toHaveBeenCalledWith({ id: 'm1', index: 'my-index' });
  });

  it('links an Agent Builder conversation source to the conversation', () => {
    renderSection({
      references: [
        {
          uri: 'conversation://conv-1',
          relation: 'derived_from',
          description: 'The conversation where this memory was recorded.',
        },
      ],
    });

    const link = screen.getByRole('link', { name: 'conversation://conv-1' });
    expect(link).toHaveAttribute('href', '/app/agent_builder/conversations/conv-1');
    expect(
      within(link).getByText('The conversation where this memory was recorded.')
    ).toBeInTheDocument();
    expect(screen.queryByText('conv-1')).not.toBeInTheDocument();
  });

  it('renders no section when derived_from sources are all unopenable', () => {
    renderSection({ references: [{ uri: 'session://s1', relation: 'derived_from' }] });

    expect(screen.queryByTestId('contextViewKiReferencesSection')).not.toBeInTheDocument();
  });

  it('calls selectKi with the referenced id and current index when a link is clicked', () => {
    renderSection({
      references: [{ uri: 'ki://target-ki', relation: 'relates_to', description: 'from' }],
    });

    fireEvent.click(screen.getByTestId('contextViewKiReferenceLink'));
    expect(mockSelectKi).toHaveBeenCalledWith({ id: 'target-ki', index: 'my-index' });
    expect(
      within(screen.getByTestId('contextViewKiReferenceLink')).getByText('from')
    ).toBeInTheDocument();
  });

  it('falls back to the id when the description is empty', () => {
    renderSection({
      references: [{ uri: 'ki://target-ki', relation: 'relates_to', description: '' }],
    });

    expect(
      within(screen.getByTestId('contextViewKiReferenceLink')).getByText('target-ki')
    ).toBeInTheDocument();
  });

  it('shows references without a known relation under Other', () => {
    renderSection({
      references: [
        { uri: 'index://logs-*' },
        { uri: 'ki://b', relation: 'custom', description: 'custom related' },
      ],
    });

    const list = screen.getByTestId('contextViewKiReferencesList');
    expect(within(list).getByText('Other')).toBeInTheDocument();
    expect(within(list).getByText('index://logs-*')).toBeInTheDocument();
    expect(within(list).getByText('custom related')).toBeInTheDocument();
  });

  it('renders non-ki uris as plain text in relates_to', () => {
    renderSection({
      references: [{ uri: 'index://logs-*', relation: 'relates_to' }],
    });

    expect(screen.getByText('index://logs-*')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiReferenceLink')).not.toBeInTheDocument();
  });

  it('shows the first 3 sources and expands the rest on demand', () => {
    renderSection({
      references: ['a', 'b', 'c', 'd', 'e'].map((id) => ({
        uri: `ki://${id}`,
        relation: 'derived_from',
      })),
    });

    expect(screen.getAllByTestId('contextViewKiReferenceLink')).toHaveLength(3);

    fireEvent.click(screen.getByText('Show 2 more'));
    expect(screen.getAllByTestId('contextViewKiReferenceLink')).toHaveLength(5);

    fireEvent.click(screen.getByText('Show less'));
    expect(screen.getAllByTestId('contextViewKiReferenceLink')).toHaveLength(3);
  });

  it('has no toggle with 3 sources or fewer', () => {
    renderSection({
      references: ['a', 'b', 'c'].map((id) => ({ uri: `ki://${id}`, relation: 'derived_from' })),
    });

    expect(screen.queryByTestId('contextViewKiReferencesToggle')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no references', () => {
    const { container } = renderSection({});

    expect(screen.queryByTestId('contextViewKiReferencesSection')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders plain text for ki uris when there is no selected index', () => {
    mockUseSelectedKi.mockReturnValue({
      selectedKi: { kiId: 'current', index: '' },
      selectKi: mockSelectKi,
      clearSelectedKi: jest.fn(),
    });

    renderSection({
      references: [{ uri: 'ki://other', relation: 'supersedes' }],
    });

    expect(screen.getByText('other')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiReferenceLink')).not.toBeInTheDocument();
  });
});
