/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadESQLAttributes } from './esql';
import { makeEmbeddableServices } from './mocks';
import { LensEmbeddableStartServices } from './types';
import { coreMock } from '@kbn/core/public/mocks';
import { BehaviorSubject } from 'rxjs';
import * as suggestionModule from '../lens_suggestions_api';
// Need to do this magic in order to spy on specific functions
import * as esqlUtils from '@kbn/esql-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
jest.mock('@kbn/esql-utils', () => ({
  __esModule: true,
  ...jest.requireActual('@kbn/esql-utils'),
}));

function getUiSettingsOverrides() {
  const core = coreMock.createStart({ basePath: '/testbasepath' });
  return core.uiSettings;
}

describe('ES|QL attributes creation', () => {
  function getServices(servicesOverrides?: Partial<LensEmbeddableStartServices>) {
    return {
      ...makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
        visOverrides: { id: 'lnsXY' },
        dataOverrides: { id: 'form_based' },
      }),
      uiSettings: { ...getUiSettingsOverrides(), get: jest.fn().mockReturnValue(true) },
      ...servicesOverrides,
    };
  }
  it('should not update the attributes if no index is available', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce(null);

    const attributes = await loadESQLAttributes(getServices());
    expect(attributes).toBeUndefined();
  });

  it('should not update the attributes if no suggestion is generated', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce('index');
    jest.spyOn(esqlUtils, 'getESQLAdHocDataview').mockResolvedValueOnce(dataViewMock);
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValueOnce([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([]);

    const attributes = await loadESQLAttributes(getServices());
    expect(attributes).toBeUndefined();
  });

  it('should update the attributes if there is a valid suggestion', async () => {
    jest.spyOn(esqlUtils, 'getIndexForESQLQuery').mockResolvedValueOnce('index');
    jest.spyOn(esqlUtils, 'getESQLAdHocDataview').mockResolvedValueOnce(dataViewMock);
    jest.spyOn(esqlUtils, 'getESQLQueryColumns').mockResolvedValueOnce([]);
    jest.spyOn(suggestionModule, 'suggestionsApi').mockReturnValue([
      {
        title: 'MyTitle',
        visualizationId: 'lnsXY',
        datasourceId: 'form_based',
        datasourceState: {},
        visualizationState: {},
        columns: 1,
        score: 1,
        previewIcon: 'icon',
        changeType: 'initial',
        keptLayerIds: [],
      },
    ]);

    const attributes = await loadESQLAttributes(getServices());
    expect(attributes).not.toBeUndefined();
  });
});
