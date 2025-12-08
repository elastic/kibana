/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  CLOUD_CONNECT_CLUSTER_CONNECTED,
  CLOUD_CONNECT_CLUSTER_DISCONNECTED,
  CLOUD_CONNECT_SERVICE_ENABLED,
  CLOUD_CONNECT_SERVICE_DISABLED,
  CLOUD_CONNECT_LINK_CLICKED,
} from './constants';
import type { ServiceToggledProps, LinkClickedProps } from './types';

export class CloudConnectTelemetryService {
  constructor(private readonly analytics: AnalyticsServiceSetup) {}

  public trackClusterConnected() {
    this.analytics.reportEvent(CLOUD_CONNECT_CLUSTER_CONNECTED, {});
  }

  public trackClusterDisconnected() {
    this.analytics.reportEvent(CLOUD_CONNECT_CLUSTER_DISCONNECTED, {});
  }

  public trackServiceEnabled(params: ServiceToggledProps) {
    this.analytics.reportEvent(CLOUD_CONNECT_SERVICE_ENABLED, params);
  }

  public trackServiceDisabled(params: ServiceToggledProps) {
    this.analytics.reportEvent(CLOUD_CONNECT_SERVICE_DISABLED, params);
  }

  public trackLinkClicked(params: LinkClickedProps) {
    this.analytics.reportEvent(CLOUD_CONNECT_LINK_CLICKED, params);
  }
}
