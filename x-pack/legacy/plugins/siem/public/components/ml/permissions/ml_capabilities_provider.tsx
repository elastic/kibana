/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useContext } from 'react';
import { MlCapabilities } from '../types';
import { getMlCapabilities } from '../api/get_ml_capabilities';
import { KibanaConfigContext } from '../../../lib/adapters/framework/kibana_framework_adapter';

const empty: MlCapabilities = {
  capabilities: {
    canGetJobs: false,
    canCreateJob: false,
    canDeleteJob: false,
    canOpenJob: false,
    canCloseJob: false,
    canForecastJob: false,
    canGetDatafeeds: false,
    canStartStopDatafeed: false,
    canUpdateJob: false,
    canUpdateDatafeed: false,
    canPreviewDatafeed: false,
    canGetCalendars: false,
    canCreateCalendar: false,
    canDeleteCalendar: false,
    canGetFilters: false,
    canCreateFilter: false,
    canDeleteFilter: false,
    canFindFileStructure: false,
    canGetDataFrameJobs: false,
    canDeleteDataFrameJob: false,
    canPreviewDataFrameJob: false,
    canCreateDataFrameJob: false,
    canStartStopDataFrameJob: false,
  },
  isPlatinumOrTrialLicense: false,
  mlFeatureEnabledInSpace: false,
  upgradeInProgress: false,
};

export const MlCapabilitiesContext = React.createContext<MlCapabilities>(empty);

export const MlCapabilitiesProvider = React.memo<{ children: JSX.Element }>(({ children }) => {
  const [capabilities, setCapabilities] = useState(empty);
  const config = useContext(KibanaConfigContext);

  const fetchFunc = async () => {
    // TODO: Replace this getMlCapabilities with a useContext on the config call
    const mlCapabilities = await getMlCapabilities({ 'kbn-version': config.kbnVersion });
    setCapabilities(mlCapabilities);
  };

  useEffect(() => {
    fetchFunc();
  }, []);

  return (
    <MlCapabilitiesContext.Provider value={capabilities}>{children}</MlCapabilitiesContext.Provider>
  );
});
