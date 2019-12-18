/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';

const WATCHER_API_ROOT = '/api/watcher';

// TODO: replace watcher api with the proper from alerts

export async function getMatchingIndicesForThresholdAlertType({
  pattern,
  http,
}: {
  pattern: string;
  http: HttpServiceBase;
}): Promise<Record<string, any>> {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const { indices } = await http.post(`${WATCHER_API_ROOT}/indices`, {
    body: JSON.stringify({ pattern }),
  });
  return indices;
}

export async function getThresholdAlertTypeFields({
  indexes,
  http,
}: {
  indexes: string[];
  http: HttpServiceBase;
}): Promise<Record<string, any>> {
  const { fields } = await http.post(`${WATCHER_API_ROOT}/fields`, {
    body: JSON.stringify({ indexes }),
  });
  return fields;
}

let savedObjectsClient: any;

export const setSavedObjectsClient = (aSavedObjectsClient: any) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => {
  return savedObjectsClient;
};

export const loadIndexPatterns = async () => {
  const { savedObjects } = await getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });
  return savedObjects;
};

export async function getThresholdAlertVisualizationData({
  model,
  visualizeOptions,
  http,
}: {
  model: any;
  visualizeOptions: any;
  http: HttpServiceBase;
}): Promise<Record<string, any>> {
  const { visualizeData } = await http.post(`${WATCHER_API_ROOT}/watch/visualize`, {
    body: JSON.stringify({
      watch: model,
      options: visualizeOptions,
    }),
  });
  return visualizeData;
}
