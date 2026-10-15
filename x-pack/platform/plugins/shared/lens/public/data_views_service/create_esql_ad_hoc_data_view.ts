/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpStart } from '@kbn/core/public';
import { EsqlSource } from '@kbn/data-source';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

/**
 * Creates the ES|QL ad-hoc DataView of a query's dataset. Its id is the `datasetId` unless a persisted one is given.
 */
export const createEsqlAdHocDataView = async ({
  dataViews,
  query,
  http,
  projectRouting,
  id,
  allowNoIndex,
  skipFetchFields = false,
}: {
  dataViews: DataViewsPublicPluginStart;
  query: string;
  http?: HttpStart;
  projectRouting?: string;
  id?: string;
  allowNoIndex?: boolean;
  skipFetchFields?: boolean;
}) => {
  const { datasetId, title, timeFieldName } = await EsqlSource.resolveDataset({
    query,
    http,
    projectRouting,
  });
  return dataViews.create(
    { id: id ?? datasetId, title, type: ESQL_TYPE, allowNoIndex, timeFieldName },
    skipFetchFields
  );
};
