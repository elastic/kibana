/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { createPrepackagedRules } from './api';

type Return = [boolean, boolean | null];

interface UseCreatePackagedRules {
  canUserCRUD: boolean | null;
  hasIndexManage: boolean | null;
  hasManageApiKey: boolean | null;
  isAuthenticated: boolean | null;
  isSignalIndexExists: boolean | null;
}

/**
 * Hook for creating the packages rules
 *
 * @param canUserCRUD boolean
 * @param hasIndexManage boolean
 * @param hasManageApiKey boolean
 * @param isAuthenticated boolean
 * @param isSignalIndexExists boolean
 *
 *  @returns [loading, hasCreatedPackageRules]
 */
export const useCreatePackagedRules = ({
  canUserCRUD,
  hasIndexManage,
  hasManageApiKey,
  isAuthenticated,
  isSignalIndexExists,
}: UseCreatePackagedRules): Return => {
  const [hasCreatedPackageRules, setHasCreatedPackageRules] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function createRules() {
      try {
        await createPrepackagedRules({
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setHasCreatedPackageRules(true);
        }
      } catch (error) {
        if (isSubscribed) {
          setHasCreatedPackageRules(false);
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }
    if (
      canUserCRUD &&
      hasIndexManage &&
      hasManageApiKey &&
      isAuthenticated &&
      isSignalIndexExists
    ) {
      createRules();
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [canUserCRUD, hasIndexManage, hasManageApiKey, isAuthenticated, isSignalIndexExists]);

  return [loading, hasCreatedPackageRules];
};
