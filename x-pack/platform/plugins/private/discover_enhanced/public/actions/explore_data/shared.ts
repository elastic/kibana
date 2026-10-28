/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiPublishesDataSources } from '@kbn/presentation-publishing';

export const getDataViews = (embeddable: EmbeddableApiContext['embeddable']): string[] => {
  if (!apiPublishesDataSources(embeddable)) return [];

  const dataSources = embeddable.dataSources$.getValue() ?? [];
  return dataSources.reduce(
    (prev: string[], current) => (current.id ? [...prev, current.id] : prev),
    []
  );
};

export const hasExactlyOneDataView = (embeddable: EmbeddableApiContext['embeddable']): boolean =>
  getDataViews(embeddable).length === 1;
