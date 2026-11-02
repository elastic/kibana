/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { NotebookAttributes } from '../../common/types';
import { createNotebookApi } from './notebook_api';

const attributes: NotebookAttributes = { title: 'Traffic', cellOrder: [], cells: {} };

describe('createNotebookApi', () => {
  it('sends attributes as the JSON body and escapes ids in the path', async () => {
    const http = httpServiceMock.createStartContract();
    const api = createNotebookApi(http);

    await api.create(attributes);
    await api.update('a/b', attributes);
    await api.delete('a/b');

    expect(http.post).toHaveBeenCalledWith('/internal/notebook', {
      body: JSON.stringify(attributes),
    });
    expect(http.put).toHaveBeenCalledWith('/internal/notebook/a%2Fb', {
      body: JSON.stringify(attributes),
    });
    expect(http.delete).toHaveBeenCalledWith('/internal/notebook/a%2Fb');
  });

  it('passes find options as query parameters', async () => {
    const http = httpServiceMock.createStartContract();

    await createNotebookApi(http).find({ search: 'traffic', page: 2, perPage: 10 });

    expect(http.get).toHaveBeenCalledWith('/internal/notebook/_find', {
      query: { search: 'traffic', page: 2, perPage: 10 },
    });
  });
});
