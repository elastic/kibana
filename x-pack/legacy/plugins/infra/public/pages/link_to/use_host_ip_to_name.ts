/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { IpToHostResponse } from '../../../server/routes/ip_to_hostname';
import { fetch } from '../../utils/fetch';

export const useHostIpToName = (ipAddress: string | null, indexPattern: string | null) => {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoadingState] = useState<boolean>(true);
  const [data, setData] = useState<IpToHostResponse | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingState(true);
      setError(null);
      try {
        if (ipAddress && indexPattern) {
          const response = await fetch.post<IpToHostResponse>('../api/infra/ip_to_host', {
            ip: ipAddress,
            index_pattern: indexPattern,
          });
          setLoadingState(false);
          setData(response.data);
        }
      } catch (err) {
        setLoadingState(false);
        setError(err);
      }
    })();
  }, [ipAddress, indexPattern]);
  return { name: (data && data.host) || null, loading, error };
};
