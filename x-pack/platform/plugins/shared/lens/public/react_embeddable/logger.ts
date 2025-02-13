/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Conditional (window.ELASTIC_LENS_LOGGER needs to be set to true) logger function
 * @param message - mandatory message to log
 * @param payload - optional object to log
 */

export const addLog = (message: string, payload?: unknown) => {
  // @ts-expect-error
  const logger = window?.ELASTIC_LENS_LOGGER;

  if (logger) {
    if (logger === 'debug') {
      // eslint-disable-next-line no-console
      console.log(`[Lens] ${message}`, payload);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Lens] ${message}`);
    }
  }
};
