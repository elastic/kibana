/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies, AnomaliesByNetwork } from '../types';
import { getNetworkFromInfluencers } from '../influencers/get_network_from_influencers';

export const convertAnomaliesToNetwork = (anomalies: Anomalies | null): AnomaliesByNetwork[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByNetwork[]>((accum, item) => {
      if (item.entityName === 'source.ip' || item.entityName === 'destination.ip') {
        return [...accum, { ip: item.entityValue, type: item.entityName, anomaly: item }];
      } else {
        const network = getNetworkFromInfluencers(item.influencers);
        if (network != null) {
          return [...accum, { ip: network.ip, type: network.type, anomaly: item }];
        } else {
          return accum;
        }
      }
    }, []);
  }
};
