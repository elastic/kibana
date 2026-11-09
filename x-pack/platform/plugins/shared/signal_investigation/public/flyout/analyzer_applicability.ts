/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type InvestigationSeed,
  isEsqlQuery,
  resolveInvestigationHosts,
} from '@kbn/investigation-seed';
import { isLogVolumeAnchor } from '../../common/log_volume_anchor';

const SERVICE_ANALYZERS = new Set([
  'service_change_points',
  'dependency_change_points',
  'service_anomalies',
  'service_hosts',
]);
const LOG_ANALYZERS = new Set(['log_change_points']);
const HOST_ANALYZERS = new Set(['metric_change_points']);
const LOG_RATE_ANALYZER_ID = 'log_rate_analysis';

const hasServiceOrHost = (seed: InvestigationSeed): boolean =>
  Boolean(seed.entities['service.name'] || resolveInvestigationHosts(seed).length > 0);

/** Client-side gate so the flyout does not POST an analysis the seed cannot satisfy. */
export const analyzerApplies = (analyzerId: string, seed: InvestigationSeed): boolean => {
  if (SERVICE_ANALYZERS.has(analyzerId)) {
    return Boolean(seed.entities['service.name']);
  }
  if (LOG_ANALYZERS.has(analyzerId) || HOST_ANALYZERS.has(analyzerId)) {
    if (seed.query && isEsqlQuery(seed.query)) {
      return false;
    }
    return hasServiceOrHost(seed);
  }
  if (analyzerId === LOG_RATE_ANALYZER_ID) {
    return isLogVolumeAnchor(seed);
  }
  return true;
};

export const inapplicabilityMessage = (
  analyzerId: string,
  seed: InvestigationSeed
): string | undefined => {
  if (SERVICE_ANALYZERS.has(analyzerId) && !seed.entities['service.name']) {
    return i18n.translate('xpack.signalInvestigation.flyout.needsService', {
      defaultMessage: 'Needs a service name',
    });
  }
  if (LOG_ANALYZERS.has(analyzerId) || HOST_ANALYZERS.has(analyzerId)) {
    if (seed.query && isEsqlQuery(seed.query)) {
      return i18n.translate('xpack.signalInvestigation.flyout.esqlUnsupported', {
        defaultMessage: 'Does not run on ES|QL queries',
      });
    }
    if (!hasServiceOrHost(seed)) {
      return i18n.translate('xpack.signalInvestigation.flyout.needsServiceOrHost', {
        defaultMessage: 'Needs a service or host name',
      });
    }
  }
  if (analyzerId === LOG_RATE_ANALYZER_ID) {
    if (seed.origin.app === 'discover' && seed.origin.surface === 'document') {
      return i18n.translate('xpack.signalInvestigation.flyout.notVolumeDocument', {
        defaultMessage: 'Single log documents are not a log-volume anchor',
      });
    }
    if (!isLogVolumeAnchor(seed)) {
      return i18n.translate('xpack.signalInvestigation.flyout.needsLogVolumeAnchor', {
        defaultMessage: 'Runs on log-volume changes',
      });
    }
  }
  return undefined;
};
