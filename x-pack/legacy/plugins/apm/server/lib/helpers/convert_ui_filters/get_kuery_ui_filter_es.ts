/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { Server } from '@hapi/hapi';
import { idx } from '@kbn/elastic-idx';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { ISavedObject } from '../../../../public/services/rest/savedObjects';
import { StaticIndexPattern } from '../../../../../../../../src/legacy/core_plugins/data/public';
import { getAPMIndexPattern } from '../../../lib/index_pattern';

export async function getKueryUiFilterES(
  server: Server,
  kuery?: string
): Promise<ESFilter | undefined> {
  if (!kuery) {
    return;
  }

  const apmIndexPattern = await getAPMIndexPattern(server);
  const formattedIndexPattern = getFromSavedObject(apmIndexPattern);

  if (!formattedIndexPattern) {
    return;
  }

  return convertKueryToEsQuery(kuery, formattedIndexPattern) as ESFilter;
}

// lifted from src/legacy/ui/public/index_patterns/static_utils/index.js
export function getFromSavedObject(apmIndexPattern: ISavedObject) {
  if (idx(apmIndexPattern, _ => _.attributes.fields) === undefined) {
    return;
  }

  return {
    id: apmIndexPattern.id,
    fields: JSON.parse(apmIndexPattern.attributes.fields),
    title: apmIndexPattern.attributes.title
  };
}

function convertKueryToEsQuery(
  kuery: string,
  indexPattern: StaticIndexPattern
) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}
