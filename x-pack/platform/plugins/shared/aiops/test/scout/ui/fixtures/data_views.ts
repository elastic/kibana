/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';

export async function ensureDataView(
  apiServices: ApiServicesFixture,
  title: string,
  timeFieldName: string,
  spaceId: string
): Promise<void> {
  const { data: existing } = await apiServices.dataViews.getAll(spaceId);
  if (existing.some((dataView) => dataView.title === title)) {
    return;
  }

  await apiServices.dataViews.create({ title, timeFieldName, spaceId });
}
