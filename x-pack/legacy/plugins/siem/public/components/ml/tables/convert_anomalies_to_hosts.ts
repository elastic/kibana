/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies, AnomaliesByHost } from '../types';
import { getHostNameFromInfluencers } from '../influencers/get_host_name_from_influencers';

export const convertAnomaliesToHosts = (anomalies: Anomalies | null): AnomaliesByHost[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByHost[]>((accum, item) => {
      if (item.entityName === 'host.name') {
        return [...accum, { hostName: item.entityValue, anomaly: item }];
      } else {
        const hostName = getHostNameFromInfluencers(item.influencers);
        if (hostName != null) {
          return [...accum, { hostName, anomaly: item }];
        } else {
          return accum;
        }
      }
    }, []);
  }
};
