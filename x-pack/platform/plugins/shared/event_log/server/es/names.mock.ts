/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsNames } from './names';

const createNamesMock = () => {
  const mock: jest.Mocked<EsNames> = {
    base: '.kibana',
    dataStream: '.kibana-event-log-8.0.0',
    indexPattern: '.kibana-event-log-*',
    indexTemplate: '.kibana-event-log-8.0.0-template',
  };
  return mock;
};

export const namesMock = {
  create: createNamesMock,
};
