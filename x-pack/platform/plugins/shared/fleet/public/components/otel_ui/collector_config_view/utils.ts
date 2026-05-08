/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ComponentHealth } from '../../../../common/types';

export type ComponentHealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export const ALL_PIPELINES = '__all__';
export const SIGNAL_PREFIX = '__signal__';

export const getSignalType = (pipelineId: string): string => pipelineId.split('/')[0];

export const getComponentHealthStatus = (
  componentHealth: ComponentHealth | undefined
): ComponentHealthStatus => {
  if (!componentHealth) return 'unknown';
  switch (componentHealth.status) {
    case 'StatusOK':
    case 'StatusStarting':
      return 'healthy';
    case 'StatusRecoverableError':
    case 'StatusPermanentError':
    case 'StatusFatalError':
      return 'unhealthy';
    case 'StatusNone':
    default:
      return 'unknown';
  }
};

export const getHealthStatusLabel = (healthStatus: ComponentHealthStatus) => {
  if (healthStatus === 'healthy') {
    return i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusHealthy', {
      defaultMessage: 'Healthy',
    });
  } else if (healthStatus === 'unhealthy') {
    return i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusUnhealthy', {
      defaultMessage: 'Unhealthy',
    });
  }
  return i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusUnknown', {
    defaultMessage: 'Unknown',
  });
};

export const HEALTH_STATUS_COLORS: Record<ComponentHealthStatus, string> = {
  healthy: 'success',
  unhealthy: 'warning',
  unknown: 'subdued',
};
