/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { getIndexPatternsObjects } from '../../utils';
import { LensEmbeddableStartServices, LensRuntimeState } from '../types';

export async function getUsedDataViews(
  references: LensRuntimeState['attributes']['references'],
  adHocDataViewsSpecs: LensRuntimeState['attributes']['state']['adHocDataViews'],
  dataViews: LensEmbeddableStartServices['dataViews']
) {
  const [{ indexPatterns }, ...adHocDataViews] = await Promise.all([
    getIndexPatternsObjects(references.map(({ id }) => id) || [], dataViews),
    ...Object.values(adHocDataViewsSpecs || {}).map((spec) => dataViews.create(spec)),
  ]);

  return uniqBy(indexPatterns.concat(adHocDataViews), 'id');
}
