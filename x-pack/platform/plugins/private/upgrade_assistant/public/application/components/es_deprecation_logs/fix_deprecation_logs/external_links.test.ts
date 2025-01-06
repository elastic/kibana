/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeprecationDataView } from './external_links';

import { DEPRECATION_LOGS_INDEX_PATTERN } from '../../../../../common/constants';
import { dataPluginMock, Start } from '@kbn/data-plugin/public/mocks';

describe('External Links', () => {
  let dataService: Start;

  beforeEach(() => {
    dataService = dataPluginMock.createStartContract();
  });

  describe('getDeprecationDataView', () => {
    it('creates new data view if doesnt exist', async () => {
      dataService.dataViews.find = jest.fn().mockResolvedValue([]);
      dataService.dataViews.createAndSave = jest.fn().mockResolvedValue({ id: '123-456' });

      const dataViewId = (await getDeprecationDataView(dataService)).id;

      expect(dataViewId).toBe('123-456');
      // prettier-ignore
      expect(dataService.dataViews.createAndSave).toHaveBeenCalledWith({
        title: DEPRECATION_LOGS_INDEX_PATTERN,
        allowNoIndex: true,
      }, false, true);
    });

    it('uses existing data view if it already exists', async () => {
      dataService.dataViews.find = jest.fn().mockResolvedValue([
        {
          id: '123-456',
          title: DEPRECATION_LOGS_INDEX_PATTERN,
        },
      ]);

      const dataViewId = await (await getDeprecationDataView(dataService)).id;

      expect(dataViewId).toBe('123-456');
      expect(dataService.dataViews.find).toHaveBeenCalledWith(DEPRECATION_LOGS_INDEX_PATTERN);
    });
  });
});
