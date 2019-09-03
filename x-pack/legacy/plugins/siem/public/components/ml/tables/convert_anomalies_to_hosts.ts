/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies, AnomaliesByHost, Anomaly } from '../types';
import { getHostNameFromInfluencers } from '../influencers/get_host_name_from_influencers';

export const convertAnomaliesToHosts = (
  anomalies: Anomalies | null,
  hostName?: string
): AnomaliesByHost[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByHost[]>((accum, item) => {
      if (getHostNameFromEntity(item, hostName)) {
        return [...accum, { hostName: item.entityValue, anomaly: item }];
      } else {
        const hostNameFromInfluencers = getHostNameFromInfluencers(item.influencers, hostName);
        if (hostNameFromInfluencers != null) {
          return [...accum, { hostName: hostNameFromInfluencers, anomaly: item }];
        } else {
          return accum;
        }
      }
    }, []);
  }
};

export const getHostNameFromEntity = (anomaly: Anomaly, hostName?: string): boolean => {
  if (anomaly.entityName !== 'host.name') {
    return false;
  } else if (hostName == null) {
    return true;
  } else {
    return anomaly.entityValue === hostName;
  }
};
