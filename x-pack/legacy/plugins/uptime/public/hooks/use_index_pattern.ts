/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, Dispatch } from 'react';
import { HttpHandler } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

const getIndexPattern = async (fetch: HttpHandler): Promise<any> => {
  return await fetch('/api/uptime/index_pattern', { method: 'GET' });
};

export const useIndexPattern = <T>(setIndexPattern: Dispatch<T>) => {
  const core = useKibana();
  useEffect(() => {
    const fetch = core.services.http?.fetch;
    if (!fetch) throw new Error('Http core services are not defined');
    getIndexPattern(fetch)
      .then(indexPattern => setIndexPattern(indexPattern))
      .catch(e => {
        throw e;
      });
  }, []);
};
