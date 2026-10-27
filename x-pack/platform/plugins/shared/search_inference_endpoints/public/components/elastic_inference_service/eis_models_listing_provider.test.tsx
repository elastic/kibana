/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { contentListKeys, contentListQueryClient } from '@kbn/content-list-provider';
import type { GroupedModel } from '../../utils/eis_utils';
import { EisModelStatus } from '../../types';
import { EisModelsListingProvider } from './eis_models_listing_provider';

jest.mock('./eis_models_listing', () => {
  const { useContentListItems } = jest.requireActual('@kbn/content-list-provider');
  return {
    EisModelsListing: () => {
      const { items } = useContentListItems();
      return (
        <ul>
          {items.map(({ id, title }: { id: string; title: string }) => (
            <li key={id} data-test-subj={`eisModelsListingItem-${title}`}>
              {title}
            </li>
          ))}
        </ul>
      );
    },
  };
});

const model = (modelName: string): GroupedModel => ({
  service: 'elastic',
  modelName,
  modelCreator: 'Elastic',
  modelStatus: EisModelStatus.GA,
  taskTypes: ['text_embedding'],
  categories: ['Embedding'],
  endpoints: [
    {
      inference_id: `${modelName}-endpoint`,
      task_type: 'text_embedding',
      service: 'elastic',
      service_settings: { model_id: `${modelName}-id` },
    },
  ],
});

const renderProvider = (models: GroupedModel[]) =>
  render(
    <EisModelsListingProvider models={models} canManage={true} onViewModelDetails={jest.fn()} />
  );

describe('EisModelsListingProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    contentListQueryClient.clear();
  });

  it('shows the new models when the models change', async () => {
    const invalidateQueriesSpy = jest.spyOn(contentListQueryClient, 'invalidateQueries');
    const { rerender } = renderProvider([model('ELSER v2')]);
    expect(await screen.findByTestId('eisModelsListingItem-ELSER v2')).toBeInTheDocument();
    expect(screen.queryByTestId('eisModelsListingItem-CLIP v2')).not.toBeInTheDocument();

    rerender(
      <EisModelsListingProvider
        models={[model('ELSER v2'), model('CLIP v2')]}
        canManage={true}
        onViewModelDetails={jest.fn()}
      />
    );

    expect(await screen.findByTestId('eisModelsListingItem-CLIP v2')).toBeInTheDocument();
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: contentListKeys.all('eis-models-listing-card-0-0-0'),
    });
  });

  it('does not refresh the listing when the models stay the same', async () => {
    const invalidateQueriesSpy = jest.spyOn(contentListQueryClient, 'invalidateQueries');
    const models = [model('ELSER v2')];
    const { rerender } = renderProvider(models);
    expect(await screen.findByTestId('eisModelsListingItem-ELSER v2')).toBeInTheDocument();

    rerender(
      <EisModelsListingProvider models={models} canManage={false} onViewModelDetails={jest.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByTestId('eisModelsListingItem-ELSER v2')).toBeInTheDocument()
    );
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
