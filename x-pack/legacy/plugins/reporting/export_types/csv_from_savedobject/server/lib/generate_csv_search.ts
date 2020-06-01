/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IUiSettingsClient,
  KibanaRequest,
  RequestHandlerContext,
} from '../../../../../../../../src/core/server';
import {
  esQuery,
  EsQueryConfig,
  Filter,
  IIndexPattern,
  Query,
} from '../../../../../../../../src/plugins/data/server';
import { CancellationToken } from '../../../../../../../plugins/reporting/common';
import { LevelLogger } from '../../../../server/lib';
import { ReportingCore } from '../../../../server';
import { createGenerateCsv } from '../../../csv/server/lib/generate_csv';
import {
  CsvResultFromSearch,
  GenerateCsvParams,
  JobParamsDiscoverCsv,
  SearchRequest,
} from '../../../csv/types';
import { IndexPatternField, QueryFilter, SearchPanel, SearchSource } from '../../types';
import { getDataSource } from './get_data_source';
import { getFilters } from './get_filters';

const getEsQueryConfig = async (config: IUiSettingsClient) => {
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
  } as EsQueryConfig;
};

const getUiSettings = async (config: IUiSettingsClient) => {
  const configs = await Promise.all([config.get('csv:separator'), config.get('csv:quoteValues')]);
  const [separator, quoteValues] = configs;
  return { separator, quoteValues };
};

export async function generateCsvSearch(
  reporting: ReportingCore,
  context: RequestHandlerContext,
  req: KibanaRequest,
  searchPanel: SearchPanel,
  jobParams: JobParamsDiscoverCsv,
  logger: LevelLogger
): Promise<CsvResultFromSearch> {
  const savedObjectsClient = context.core.savedObjects.client;
  const { indexPatternSavedObjectId, timerange } = searchPanel;
  const savedSearchObjectAttr = searchPanel.attributes;
  const { indexPatternSavedObject } = await getDataSource(
    savedObjectsClient,
    indexPatternSavedObjectId
  );

  const uiConfig = await reporting.getUiSettingsServiceFactory(savedObjectsClient);
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
  let docValueFields: any[] | undefined;
  if (jobParams.post && jobParams.post.state) {
    ({
      post: {
        state: { query: payloadQuery, sort: payloadSort = [], docvalue_fields: docValueFields },
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

  if (indexPatternTimeField) {
    if (docValueFields) {
      docValueFields = [indexPatternTimeField].concat(docValueFields);
    } else {
      docValueFields = [indexPatternTimeField];
    }
  }

  const searchRequest: SearchRequest = {
    index: esIndex,
    body: {
      _source: { includes },
      docvalue_fields: docValueFields,
      query: esQuery.buildEsQuery(
        indexPatternSavedObject as IIndexPattern,
        (searchSourceQuery as unknown) as Query,
        (combinedFilter as unknown) as Filter,
        esQueryConfig
      ),
      script_fields: scriptFieldsConfig,
      sort: sortConfig,
    },
  };

  const config = reporting.getConfig();
  const elasticsearch = await reporting.getElasticsearchService();
  const { callAsCurrentUser } = elasticsearch.dataClient.asScoped(req);
  const callCluster = (...params: [string, object]) => callAsCurrentUser(...params);
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
      maxSizeBytes: config.get('csv', 'maxSizeBytes'),
      scroll: config.get('csv', 'scroll'),
      escapeFormulaValues: config.get('csv', 'escapeFormulaValues'),
      timezone,
    },
  };

  const generateCsv = createGenerateCsv(logger);

  return {
    type: 'CSV from Saved Search',
    result: await generateCsv(generateCsvParams),
  };
}
