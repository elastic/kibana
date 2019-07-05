/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies, AnomaliesByNetwork, Anomaly, isDestinationOrSource } from '../types';
import { getNetworkFromInfluencers } from '../influencers/get_network_from_influencers';

export const convertAnomaliesToNetwork = (
  anomalies: Anomalies | null,
  ip?: string
): AnomaliesByNetwork[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByNetwork[]>((accum, item) => {
      if (isDestinationOrSource(item.entityName) && getNetworkFromEntity(item, ip)) {
        return [...accum, { ip: item.entityValue, type: item.entityName, anomaly: item }];
      } else {
        const network = getNetworkFromInfluencers(item.influencers, ip);
        if (network != null) {
          return [...accum, { ip: network.ip, type: network.type, anomaly: item }];
        } else {
          return accum;
        }
      }
    }, []);
  }
};

export const getNetworkFromEntity = (anomaly: Anomaly, ip?: string): boolean => {
  if (isDestinationOrSource(anomaly.entityName)) {
    if (ip == null) {
      return true;
    } else {
      return anomaly.entityValue === ip;
    }
  } else {
    return false;
  }
};
