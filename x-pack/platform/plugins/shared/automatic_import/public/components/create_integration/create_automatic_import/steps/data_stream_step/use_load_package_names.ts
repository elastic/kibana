/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { getInstalledPackages, useKibana } from '../../../../../common';
import * as i18n from './translations';

export const useLoadPackageNames = () => {
  const { http, notifications } = useKibana().services;
  const [packageNames, setPackageNames] = useState<Set<string>>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };
    (async () => {
      try {
        setIsLoading(true);
        const packagesResponse = await getInstalledPackages(deps);
        if (abortController.signal.aborted) return;
        if (!packagesResponse?.items?.length) {
          throw Error('No packages found');
        }
        setPackageNames(new Set(packagesResponse.items.map((pkg) => pkg.id)));
      } catch (e) {
        if (!abortController.signal.aborted) {
          notifications?.toasts.addError(e, {
            title: i18n.PACKAGE_NAMES_FETCH_ERROR,
          });
        }
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [http, notifications]);

  return {
    isLoading,
    packageNames,
  };
};
