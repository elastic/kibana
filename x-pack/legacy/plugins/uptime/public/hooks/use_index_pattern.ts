/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, Dispatch } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export const useIndexPattern = <T>(setIndexPattern: Dispatch<T>) => {
  const core = useKibana();
  useEffect(() => {
    const fetch = core.services.http?.fetch;
    async function getIndexPattern() {
      if (!fetch) throw new Error('Http core services are not defined');
      setIndexPattern(await fetch('/api/uptime/index_pattern', { method: 'GET' }));
    }
    getIndexPattern();
  }, [core.services.http, setIndexPattern]);
};
