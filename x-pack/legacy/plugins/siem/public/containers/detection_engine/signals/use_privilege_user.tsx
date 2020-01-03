/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { useUiSetting$ } from '../../../lib/kibana';
import { getUserPrivilege } from './api';

type Return = [boolean, boolean | null, boolean | null];

/**
 * Hook to get user privilege from
 *
 * @param query convert a dsl into string
 *
 */
export const usePrivilegeUser = (): Return => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState<boolean | null>(null);
  const [hasWrite, setHasWrite] = useState<boolean | null>(null);
  const [kbnVersion] = useUiSetting$<string>(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const privilege = await getUserPrivilege({
          kbnVersion,
          signal: abortCtrl.signal,
        });

        if (isSubscribed && privilege != null) {
          setAuthenticated(privilege.isAuthenticated);
          if (privilege.index != null && Object.keys(privilege.index).length > 0) {
            const indexName = Object.keys(privilege.index)[0];
            setHasWrite(privilege.index[indexName].create_index);
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setAuthenticated(false);
          setHasWrite(false);
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return [loading, isAuthenticated, hasWrite];
};
