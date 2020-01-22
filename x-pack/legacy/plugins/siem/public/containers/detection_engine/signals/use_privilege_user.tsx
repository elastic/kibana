/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../../components/toasters';
import { getUserPrivilege } from './api';
import * as i18n from './translations';

interface Return {
  loading: boolean;
  isAuthenticated: boolean | null;
  hasIndexManage: boolean | null;
  hasManageApiKey: boolean | null;
  hasIndexWrite: boolean | null;
}
/**
 * Hook to get user privilege from
 *
 */
export const usePrivilegeUser = (): Return => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState<boolean | null>(null);
  const [hasIndexManage, setHasIndexManage] = useState<boolean | null>(null);
  const [hasIndexWrite, setHasIndexWrite] = useState<boolean | null>(null);
  const [hasManageApiKey, setHasManageApiKey] = useState<boolean | null>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const privilege = await getUserPrivilege({
          signal: abortCtrl.signal,
        });

        if (isSubscribed && privilege != null) {
          setAuthenticated(privilege.is_authenticated);
          if (privilege.index != null && Object.keys(privilege.index).length > 0) {
            const indexName = Object.keys(privilege.index)[0];
            setHasIndexManage(privilege.index[indexName].manage);
            setHasIndexWrite(privilege.index[indexName].write);
            setHasManageApiKey(
              privilege.cluster.manage_security ||
                privilege.cluster.manage_api_key ||
                privilege.cluster.manage_own_api_key
            );
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setAuthenticated(false);
          setHasIndexManage(false);
          setHasIndexWrite(false);
          setHasManageApiKey(false);
          errorToToaster({ title: i18n.PRIVILEGE_FETCH_FAILURE, error, dispatchToaster });
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

  return { loading, isAuthenticated, hasIndexManage, hasManageApiKey, hasIndexWrite };
};
