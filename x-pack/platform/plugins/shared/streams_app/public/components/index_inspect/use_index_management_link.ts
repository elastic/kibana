/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import { useKibana } from '../../hooks/use_kibana';

/** Index Management data-stream details URL, or undefined when the locator is unavailable. */
export const useIndexManagementLink = (
  indexName: string,
  isDataStream: boolean
): string | undefined => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  if (!isDataStream) {
    return undefined;
  }

  const locator = share.url.locators.get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID);

  return locator?.getRedirectUrl({
    page: 'data_streams_details',
    dataStreamName: indexName,
  });
};
