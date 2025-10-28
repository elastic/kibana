/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AsyncField, createPrebuildFields } from './use_rule_description_fields';
import { screen, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from './rule_detail_description_type';

describe('use_rule_description_fields', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.invalidateQueries();
    queryClient.clear();
  });

  describe('AsyncField', () => {
    it('should render async loaded data', async () => {
      const RESPONSE_TEXT = 'my test data';
      const mockQueryFn = jest.fn().mockResolvedValue({ data: RESPONSE_TEXT });

      render(
        <AsyncField<{
          data: string;
        }>
          queryKey={['test-query']}
          queryFn={mockQueryFn}
        >
          {(response) => <div>{response.data}</div>}
        </AsyncField>,
        { wrapper }
      );

      expect(await screen.findByText(RESPONSE_TEXT)).toBeInTheDocument();
    });
  });

  describe('prebuild fields: data view index pattern', () => {
    it('should fetch the index pattern by id', async () => {
      const DATA_VIEW_ID = 'my-data-view-id';
      const DATA_VIEW_INDEX_PATTERN = '.test_index_pattern*';
      const httpMock = {
        post: jest.fn().mockResolvedValueOnce({
          result: { result: { item: { attributes: { title: DATA_VIEW_INDEX_PATTERN } } } },
        }),
      };

      const prebuildFields = createPrebuildFields({
        border: '1px solid red',
        http: httpMock as unknown as HttpSetup,
      });

      const node =
        prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN](DATA_VIEW_ID);

      render(node.description, { wrapper });

      expect(httpMock.post).toHaveBeenCalledWith('/api/content_management/rpc/get', {
        body: expect.stringContaining(`\"id\":\"${DATA_VIEW_ID}\"`),
      });

      expect(await screen.findByTestId('rule-description-index-patterns')).toBeInTheDocument();
      expect(screen.getByText(DATA_VIEW_INDEX_PATTERN)).toBeInTheDocument();
    });

    it('should show error "-" when something goes wrong', async () => {
      jest.spyOn(console, 'error').mockImplementation(jest.fn());
      const DATA_VIEW_ID = 'my-data-view-id-error-test';
      const httpMock = {
        post: jest.fn().mockRejectedValueOnce(new Error('unexpected error')),
      };

      const prebuildFields = createPrebuildFields({
        border: '1px solid red',
        http: httpMock as unknown as HttpSetup,
      });

      const node =
        prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN](DATA_VIEW_ID);

      render(node.description, { wrapper });

      expect(
        await screen.findByTestId('rule-description-field-error-boundary')
      ).toBeInTheDocument();
    });
  });
});
