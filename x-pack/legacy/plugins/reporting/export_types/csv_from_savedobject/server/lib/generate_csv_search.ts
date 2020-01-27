/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no module definition TODO
import { createGenerateCsv } from '../../../csv/server/lib/generate_csv';
import { CancellationToken } from '../../../../common/cancellation_token';
import { ServerFacade, RequestFacade, Logger } from '../../../../types';
import { SavedSearchObjectAttributes, SearchPanel, SearchRequest, SearchSource } from '../../types';
import {
  CsvResultFromSearch,
  GenerateCsvParams,
  IndexPatternField,
  QueryFilter,
} from '../../types';
import { getDataSource } from './get_data_source';
import { getFilters } from './get_filters';
import { JobParamsDiscoverCsv } from '../../../csv/types';

import {
  esQuery,
  esFilters,
  IIndexPattern,
  Query,
  // Reporting uses an unconventional directory structure so the linter marks this as a violation, server files should
  // be moved under reporting/server/
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../../src/plugins/data/server';

const getEsQueryConfig = async (config: any) => {
  const configs = await Promise.all([
    config.get('query:allowLeadingWildcards'),
    config.get('query:queryString:options'),
    config.get('courier:ignoreFilterIfFieldNotInIndex'),
  ]);
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex] = configs;
  return {
    allowLeadingWildcards,
    queryStringOptions,
    ignoreFilterIfFieldNotInIndex,
  } as esQuery.EsQueryConfig;
};

const getUiSettings = async (config: any) => {
  const configs = await Promise.all([config.get('csv:separator'), config.get('csv:quoteValues')]);
  const [separator, quoteValues] = configs;
  return { separator, quoteValues };
};

export async function generateCsvSearch(
  req: RequestFacade,
  server: ServerFacade,
  logger: Logger,
  searchPanel: SearchPanel,
  jobParams: JobParamsDiscoverCsv
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
  const searchRequest: SearchRequest = {
    index: esIndex,
    body: {
      _source: { includes },
      docvalue_fields: docValueFields,
      query: esQuery.buildEsQuery(
        indexPatternSavedObject as IIndexPattern,
        (searchSourceQuery as unknown) as Query,
        (combinedFilter as unknown) as esFilters.Filter,
        esQueryConfig
      ),
      script_fields: scriptFieldsConfig,
      sort: sortConfig,
    },
  };
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = (...params: [string, object]) => callWithRequest(req, ...params);
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
