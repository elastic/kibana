/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { LensRuntimeState } from '@kbn/lens-common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { getIndexPatternsObjects } from '../../utils';
import type { LensEmbeddableStartServices } from '../types';

export async function getUsedDataViews(
  references: LensRuntimeState['attributes']['references'],
  adHocDataViewsSpecs: LensRuntimeState['attributes']['state']['adHocDataViews'],
  dataViews: LensEmbeddableStartServices['dataViews']
) {
  const [{ indexPatterns }, ...adHocDataViews] = await Promise.all([
    getIndexPatternsObjects(
      // get index pattern only references
      references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id),
      dataViews
    ),

    // Skip fetching fields for ES|QL data views: field metadata comes from the query result (columnsMeta).
    ...Object.values(adHocDataViewsSpecs ?? {}).map((spec) =>
      dataViews.create(spec, spec.type === ESQL_TYPE)
    ),
  ]);

  return uniqBy(indexPatterns.concat(adHocDataViews), 'id');
}
