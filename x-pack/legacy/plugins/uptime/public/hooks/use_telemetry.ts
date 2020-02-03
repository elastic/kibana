/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { HttpHandler } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export enum UptimePage {
  Overview = '/api/uptime/logOverview',
  Monitor = '/api/uptime/logMonitor',
  NotFound = '__not-found__',
}

const getApiPath = (page?: UptimePage) => {
  if (!page) throw new Error('Telemetry logging for this page not yet implemented');
  if (page === '__not-found__')
    throw new Error('Telemetry logging for 404 page not yet implemented');
  return page.valueOf();
};

const logPageLoad = async (fetch: HttpHandler, page?: UptimePage) => {
  try {
    await fetch(getApiPath(page), {
      method: 'POST',
    });
  } catch (e) {
    throw e;
  }
};

export const useUptimeTelemetry = (page?: UptimePage) => {
  const kibana = useKibana();
  const fetch = kibana.services.http?.fetch;
  useEffect(() => {
    if (!fetch) throw new Error('Core http services are not defined');
    logPageLoad(fetch, page);
  }, [fetch, page]);
};
