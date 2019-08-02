/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useContext } from 'react';
import { MlCapabilities } from '../types';
import { getMlCapabilities } from '../api/get_ml_capabilities';
import { KibanaConfigContext } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { emptyMlCapabilities } from '../empty_ml_capabilities';
import { errorToToaster } from '../api/error_to_toaster';
import { useStateToaster } from '../../toasters';

import * as i18n from './translations';

export const MlCapabilitiesContext = React.createContext<MlCapabilities>(emptyMlCapabilities);

export const MlCapabilitiesProvider = React.memo<{ children: JSX.Element }>(({ children }) => {
  const [capabilities, setCapabilities] = useState(emptyMlCapabilities);
  const config = useContext(KibanaConfigContext);
  const [, dispatchToaster] = useStateToaster();

  const fetchFunc = async () => {
    try {
      const mlCapabilities = await getMlCapabilities({ 'kbn-version': config.kbnVersion });
      setCapabilities(mlCapabilities);
    } catch (error) {
      errorToToaster({
        title: i18n.MACHINE_LEARNING_PERMISSIONS_FAILURE,
        error,
        dispatchToaster,
      });
    }
  };

  useEffect(() => {
    fetchFunc();
  }, []);

  return (
    <MlCapabilitiesContext.Provider value={capabilities}>{children}</MlCapabilitiesContext.Provider>
  );
});
