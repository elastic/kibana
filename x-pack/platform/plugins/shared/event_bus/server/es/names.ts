/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EVENT_BUS_NAME_SUFFIX = '-event-bus';

export interface EsNames {
  /** Datastream we index into and tail. */
  dataStream: string;
  /** Wildcard pattern covering the datastream's backing indices. */
  indexPattern: string;
  /** Composable index template name. */
  indexTemplate: string;
}

export const getEsNames = (baseName: string): EsNames => {
  const root = `${baseName}${EVENT_BUS_NAME_SUFFIX}`;
  return {
    dataStream: `${root}-ds`,
    indexPattern: `${root}-*`,
    indexTemplate: `${root}-template`,
  };
};
