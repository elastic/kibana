/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';
import { QualityIndicators } from '../../../common/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export type DatasetDetailsTrackingState = 'initial' | 'started' | 'opened' | 'navigated';

export enum NavigationTarget {
  Exit = 'exit',
  LogsExplorer = 'logs_explorer',
  Discover = 'discover',
  Lens = 'lens',
  Integration = 'integration',
  IndexTemplate = 'index_template',
  Dashboard = 'dashboard',
  Hosts = 'hosts',
  Services = 'services',
}

/**
 * Source UI component that triggered the navigation
 */
export enum NavigationSource {
  Header = 'header',
  Footer = 'footer',
  Summary = 'summary',
  Chart = 'chart',
  Trend = 'trend',
  Table = 'table',
  ActionMenu = 'action_menu',
  DegradedFieldFlyoutHeader = 'degraded_field_flyout_header',
  FailedDocsFlyoutErrorsTable = 'failed_docs_flyout_errors_table',
}

export interface WithTrackingId {
  tracking_id: string; // For funnel analysis and session tracking
}

export interface WithDuration {
  duration: number; // The time (in milliseconds) it took to reach the meaningful state
}

export interface DatasetEbtProps {
  index_name: string;
  data_stream: {
    dataset: string;
    namespace: string;
    type: string;
  };
  data_stream_health: QualityIndicators;
  data_stream_aggregatable: boolean;
  from: string;
  to: string;
  degraded_percentage: number;
  integration?: string;
  privileges: {
    can_monitor_data_stream: boolean;
    can_view_integrations: boolean;
    can_view_dashboards?: boolean;
  };
}

export interface DatasetEbtFilter {
  total: number;
  included: number;
  excluded: number;
}

export interface DatasetNavigatedEbtProps extends DatasetEbtProps {
  sort: { field: string; direction: 'asc' | 'desc' };
  filters: {
    is_degraded: boolean;
    query_length: number;
    integrations: DatasetEbtFilter;
    namespaces: DatasetEbtFilter;
    qualities: DatasetEbtFilter;
  };
}

export interface DatasetDetailsEbtProps extends DatasetEbtProps {
  breakdown_field?: string;
}

export interface DatasetDetailsNavigatedEbtProps extends DatasetDetailsEbtProps {
  filters: {
    is_degraded: boolean;
  };
  target: NavigationTarget;
  source: NavigationSource;
}

export interface ITelemetryClient {
  trackDatasetNavigated: (eventProps: DatasetNavigatedEbtProps) => void;
  startDatasetDetailsTracking: () => void;
  getDatasetDetailsTrackingState: () => DatasetDetailsTrackingState;
  trackDatasetDetailsOpened: (eventProps: DatasetDetailsEbtProps) => void;
  trackDatasetDetailsNavigated: (eventProps: DatasetDetailsNavigatedEbtProps) => void;
  trackDatasetDetailsBreakdownFieldChanged: (eventProps: DatasetDetailsEbtProps) => void;
}

export enum DatasetQualityTelemetryEventTypes {
  NAVIGATED = 'Dataset Quality Navigated',
  DETAILS_OPENED = 'Dataset Quality Dataset Details Opened',
  DETAILS_NAVIGATED = 'Dataset Quality Dataset Details Navigated',
  BREAKDOWN_FIELD_CHANGED = 'Dataset Quality Dataset Details Breakdown Field Changed',
}

export type DatasetQualityTelemetryEvent =
  | {
      eventType: DatasetQualityTelemetryEventTypes.NAVIGATED;
      schema: RootSchema<DatasetNavigatedEbtProps>;
    }
  | {
      eventType: DatasetQualityTelemetryEventTypes.DETAILS_OPENED;
      schema: RootSchema<DatasetDetailsEbtProps & WithTrackingId & WithDuration>;
    }
  | {
      eventType: DatasetQualityTelemetryEventTypes.DETAILS_NAVIGATED;
      schema: RootSchema<DatasetDetailsNavigatedEbtProps & WithTrackingId>;
    }
  | {
      eventType: DatasetQualityTelemetryEventTypes.BREAKDOWN_FIELD_CHANGED;
      schema: RootSchema<DatasetDetailsEbtProps & WithTrackingId>;
    };
