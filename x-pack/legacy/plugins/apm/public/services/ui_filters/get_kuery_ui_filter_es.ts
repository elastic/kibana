/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { convertKueryToEsQuery, getAPMIndexPatternForKuery } from '../kuery';

export async function getKueryUiFilterES(
  kuery?: string
): Promise<ESFilter | undefined> {
  if (!kuery) {
    return;
  }

  const indexPattern = await getAPMIndexPatternForKuery();
  if (!indexPattern) {
    return;
  }

  return convertKueryToEsQuery(kuery, indexPattern) as ESFilter;
}
