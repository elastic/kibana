/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';

// @ts-ignore no module definition
import { buildEsQuery } from '@kbn/es-query';
// @ts-ignore no module definition
import { createGenerateCsv } from '../../../csv/server/lib/generate_csv';

import { CancellationToken } from '../../../../common/cancellation_token';

import { KbnServer, Logger, JobParams } from '../../../../types';
import {
  IndexPatternSavedObject,
  SavedSearchObjectAttributes,
  SearchPanel,
  SearchRequest,
  SearchSource,
  SearchSourceQuery,
} from '../../';
import {
  CsvResultFromSearch,
  ESQueryConfig,
  GenerateCsvParams,
  Filter,
  IndexPatternField,
  QueryFilter,
} from './';
import { getDataSource } from './get_data_source';
import { getFilters } from './get_filters';

const getEsQueryConfig = async (config: any) => {
  const configs = await Promise.all([
    config.get('query:allowLeadingWildcards'),
    config.get('query:queryString:options'),
    config.get('courier:ignoreFilterIfFieldNotInIndex'),
  ]);
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex] = configs;
  return { allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex };
};

const getUiSettings = async (config: any) => {
  const configs = await Promise.all([config.get('csv:separator'), config.get('csv:quoteValues')]);
  const [separator, quoteValues] = configs;
  return { separator, quoteValues };
};

export async function generateCsvSearch(
  req: Request,
  server: KbnServer,
  logger: Logger,
  searchPanel: SearchPanel,
  jobParams: JobParams
): Promise<CsvResultFromSearch> {
  const { savedObjects, uiSettingsServiceFactory } = server;
  const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(req);
  const { indexPatternSavedObjectId, timerange } = searchPanel;
  const savedSearchObjectAttr = searchPanel.attributes as SavedSearchObjectAttributes;
  const { indexPatternSavedObject } = await getDataSource(
    savedObjectsClient,
    indexPatternSavedObjectId
  );
  const uiConfig = uiSettingsServiceFactory({ savedObjectsClient });
  const esQueryConfig = await getEsQueryConfig(uiConfig);

  const {
    kibanaSavedObjectMeta: {
      searchSource: {
        filter: [searchSourceFilter],
        query: searchSourceQuery,
      },
    },
  } = savedSearchObjectAttr as { kibanaSavedObjectMeta: { searchSource: SearchSource } };

  const {
    timeFieldName: indexPatternTimeField,
    title: esIndex,
    fields: indexPatternFields,
  } = indexPatternSavedObject;

  let payloadQuery: QueryFilter | undefined;
  let payloadSort: any[] = [];
  if (jobParams.post && jobParams.post.state) {
    ({
      post: {
        state: { query: payloadQuery, sort: payloadSort = [] },
      },
    } = jobParams);
  }

  const { includes, timezone, combinedFilter } = getFilters(
    indexPatternSavedObjectId,
    indexPatternTimeField,
    timerange,
    savedSearchObjectAttr,
    searchSourceFilter,
    payloadQuery
  );

  const savedSortConfigs = savedSearchObjectAttr.sort;
  const sortConfig = [...payloadSort];
  savedSortConfigs.forEach(([savedSortField, savedSortOrder]) => {
    sortConfig.push({ [savedSortField]: { order: savedSortOrder } });
  });
  const scriptFieldsConfig = indexPatternFields
    .filter((f: IndexPatternField) => f.scripted)
    .reduce((accum: any, curr: IndexPatternField) => {
      return {
        ...accum,
        [curr.name]: {
          script: {
            source: curr.script,
            lang: curr.lang,
          },
        },
      };
    }, {});
  const docValueFields = indexPatternTimeField ? [indexPatternTimeField] : undefined;

  // this array helps ensure the params are passed to buildEsQuery (non-Typescript) in the right order
  const buildCsvParams: [IndexPatternSavedObject, SearchSourceQuery, Filter[], ESQueryConfig] = [
    indexPatternSavedObject,
    searchSourceQuery,
    combinedFilter,
    esQueryConfig,
  ];

  const searchRequest: SearchRequest = {
    index: esIndex,
    body: {
      _source: { includes },
      docvalue_fields: docValueFields,
      query: buildEsQuery(...buildCsvParams),
      script_fields: scriptFieldsConfig,
      sort: sortConfig,
    },
  };
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = (...params: any[]) => callWithRequest(req, ...params);
  const config = server.config();
  const uiSettings = await getUiSettings(uiConfig);

  const generateCsvParams: GenerateCsvParams = {
    searchRequest,
    callEndpoint: callCluster,
    fields: includes,
    formatsMap: new Map(), // there is no field formatting in this API; this is required for generateCsv
    metaFields: [],
    conflictedTypesFields: [],
    cancellationToken: new CancellationToken(),
    settings: {
      ...uiSettings,
      maxSizeBytes: config.get('xpack.reporting.csv.maxSizeBytes'),
      scroll: config.get('xpack.reporting.csv.scroll'),
      timezone,
    },
  };

  const generateCsv = createGenerateCsv(logger);

  return {
    type: 'CSV from Saved Search',
    result: await generateCsv(generateCsvParams),
  };
}
