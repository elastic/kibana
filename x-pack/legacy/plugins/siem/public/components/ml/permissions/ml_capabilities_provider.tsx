/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';

import { MlCapabilities } from '../types';
import { getMlCapabilities } from '../api/get_ml_capabilities';
import { emptyMlCapabilities } from '../empty_ml_capabilities';
import { errorToToaster } from '../api/error_to_toaster';
import { useStateToaster } from '../../toasters';
import { useUiSetting$ } from '../../../lib/kibana';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';

import * as i18n from './translations';

interface MlCapabilitiesProvider extends MlCapabilities {
  capabilitiesFetched: boolean;
}

const emptyMlCapabilitiesProvider = {
  ...emptyMlCapabilities,
  capabilitiesFetched: false,
};

export const MlCapabilitiesContext = React.createContext<MlCapabilitiesProvider>(
  emptyMlCapabilitiesProvider
);

MlCapabilitiesContext.displayName = 'MlCapabilitiesContext';

export const MlCapabilitiesProvider = React.memo<{ children: JSX.Element }>(({ children }) => {
  const [capabilities, setCapabilities] = useState<MlCapabilitiesProvider>(
    emptyMlCapabilitiesProvider
  );
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useUiSetting$<string>(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchMlCapabilities() {
      try {
        const mlCapabilities = await getMlCapabilities(kbnVersion, abortCtrl.signal);
        if (isSubscribed) {
          setCapabilities({ ...mlCapabilities, capabilitiesFetched: true });
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({
            title: i18n.MACHINE_LEARNING_PERMISSIONS_FAILURE,
            error,
            dispatchToaster,
          });
        }
      }
    }

    fetchMlCapabilities();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return (
    <MlCapabilitiesContext.Provider value={capabilities}>{children}</MlCapabilitiesContext.Provider>
  );
});

MlCapabilitiesProvider.displayName = 'MlCapabilitiesProvider';
