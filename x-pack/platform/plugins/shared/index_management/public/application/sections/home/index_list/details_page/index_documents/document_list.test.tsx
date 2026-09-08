/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SearchHit, MappingProperty } from '@elastic/elasticsearch/lib/api/types';

import { DocumentList } from './document_list';

jest.mock('@kbn/search-index-documents', () => ({
  Result: ({ metaData, compactCard }: { metaData: { id: string }; compactCard: boolean }) => (
    <div data-test-subj={`result-${metaData.id}`} data-compact-card={String(compactCard)}>
      Result {metaData.id}
    </div>
  ),
  resultMetaData: jest.fn((doc: SearchHit) => ({
    id: doc._id,
    title: undefined,
    score: undefined,
  })),
  resultToField: jest.fn(() => []),
  reorderFieldsInImportance: jest.fn((fields: unknown[]) => fields),
}));

jest.mock('./recent_docs_action_message', () => ({
  RecentDocsActionMessage: ({ numOfDocs }: { numOfDocs: number }) => (
    <div data-test-subj="recentDocsActionMessage">{numOfDocs} documents</div>
  ),
}));

const { resultMetaData, resultToField } = jest.requireMock('@kbn/search-index-documents');

const mockDocs: SearchHit[] = [
  { _index: 'test-index', _id: 'doc-1', _source: { title: 'First' } },
  { _index: 'test-index', _id: 'doc-2', _source: { title: 'Second' } },
  { _index: 'test-index', _id: 'doc-3', _source: { title: 'Third' } },
];

const mockMappingProperties: Record<string, MappingProperty> = {
  title: { type: 'text' },
  count: { type: 'integer' },
};

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders RecentDocsActionMessage with the correct doc count', () => {
    render(<DocumentList docs={mockDocs} mappingProperties={mockMappingProperties} />);

    expect(screen.getByTestId('recentDocsActionMessage')).toHaveTextContent('3 documents');
  });

  it('renders a Result component for each document', () => {
    render(<DocumentList docs={mockDocs} mappingProperties={mockMappingProperties} />);

    expect(screen.getByTestId('result-doc-1')).toBeInTheDocument();
    expect(screen.getByTestId('result-doc-2')).toBeInTheDocument();
    expect(screen.getByTestId('result-doc-3')).toBeInTheDocument();
  });

  it('calls resultMetaData for each document', () => {
    render(<DocumentList docs={mockDocs} mappingProperties={mockMappingProperties} />);

    expect(resultMetaData).toHaveBeenCalledTimes(3);
    expect(resultMetaData).toHaveBeenCalledWith(mockDocs[0]);
    expect(resultMetaData).toHaveBeenCalledWith(mockDocs[1]);
    expect(resultMetaData).toHaveBeenCalledWith(mockDocs[2]);
  });

  it('calls resultToField with each doc and mappingProperties', () => {
    render(<DocumentList docs={mockDocs} mappingProperties={mockMappingProperties} />);

    expect(resultToField).toHaveBeenCalledTimes(3);
    expect(resultToField).toHaveBeenCalledWith(mockDocs[0], mockMappingProperties);
    expect(resultToField).toHaveBeenCalledWith(mockDocs[1], mockMappingProperties);
    expect(resultToField).toHaveBeenCalledWith(mockDocs[2], mockMappingProperties);
  });
});
