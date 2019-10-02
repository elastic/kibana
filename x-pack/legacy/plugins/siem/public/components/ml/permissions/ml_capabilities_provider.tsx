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
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';

import * as i18n from './translations';

export const MlCapabilitiesContext = React.createContext<MlCapabilities>(emptyMlCapabilities);

MlCapabilitiesContext.displayName = 'MlCapabilitiesContext';

export const MlCapabilitiesProvider = React.memo<{ children: JSX.Element }>(({ children }) => {
  const [capabilities, setCapabilities] = useState(emptyMlCapabilities);
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchMlCapabilities() {
      try {
        const mlCapabilities = await getMlCapabilities(
          { 'kbn-version': kbnVersion },
          abortCtrl.signal
        );
        if (isSubscribed) {
          setCapabilities(mlCapabilities);
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
