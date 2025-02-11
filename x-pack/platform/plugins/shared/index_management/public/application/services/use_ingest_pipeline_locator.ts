/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocatorUrl } from '@kbn/share-plugin/public';
import { useAppContext } from '../app_context';
import {
  INGEST_PIPELINES_LOCATOR_ID,
  INGEST_PIPELINES_EDIT,
  INGEST_PIPELINES_LIST,
} from '../constants';

export const useIngestPipelinesLocator = (
  page: typeof INGEST_PIPELINES_EDIT | typeof INGEST_PIPELINES_LIST,
  pipelineId?: string
): string => {
  const ctx = useAppContext();
  const locator =
    pipelineId === undefined ? null : ctx.url.locators.get(INGEST_PIPELINES_LOCATOR_ID)!;
  const url = useLocatorUrl(locator, { page, pipelineId }, {}, [page, pipelineId]);

  return url;
};
