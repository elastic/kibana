/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsType } from '../../store/hosts/model';
import { NetworkType } from '../../store/network/model';
import { FlowTarget } from '../../graphql/types';

export interface Influencer {
  influencer_field_name: string;
  influencer_field_values: string[];
}

export interface Source {
  job_id: string;
  result_type: string;
  probability: number;
  multi_bucket_impact: number;
  record_score: number;
  initial_record_score: number;
  bucket_span: number;
  detector_index: number;
  is_interim: boolean;
  timestamp: number;
  by_field_name: string;
  by_field_value: string;
  partition_field_name: string;
  partition_field_value: string;
  function: string;
  function_description: string;
  typical: number[];
  actual: number[];
  influencers: Influencer[];
}

export interface Influencer {
  influencer_field_name: string;
  influencer_field_values: string[];
}

export interface CriteriaFields {
  fieldName: string;
  fieldValue: string;
}

export interface InfluencerInput {
  fieldName: string;
  fieldValue: string;
}

export interface Anomaly {
  detectorIndex: number;
  entityName: string;
  entityValue: string;
  influencers?: Array<Record<string, string>>;
  jobId: string;
  rowId: string;
  severity: number;
  time: number;
  source: Source;
}

export interface Anomalies {
  anomalies: Anomaly[];
  interval: string;
}

export type NarrowDateRange = (score: Anomaly, interval: string) => void;

export interface AnomaliesByHost {
  hostName: string;
  anomaly: Anomaly;
}

export type DestinationOrSource = 'source.ip' | 'destination.ip';

export interface AnomaliesByNetwork {
  type: DestinationOrSource;
  ip: string;
  anomaly: Anomaly;
}

export interface HostOrNetworkProps {
  startDate: number;
  endDate: number;
  narrowDateRange: NarrowDateRange;
  skip: boolean;
}

export type AnomaliesHostTableProps = HostOrNetworkProps & {
  hostName?: string;
  type: HostsType;
};

export type AnomaliesNetworkTableProps = HostOrNetworkProps & {
  ip?: string;
  type: NetworkType;
  flowTarget?: FlowTarget;
};

export interface MlCapabilities {
  capabilities: {
    canGetJobs: boolean;
    canCreateJob: boolean;
    canDeleteJob: boolean;
    canOpenJob: boolean;
    canCloseJob: boolean;
    canForecastJob: boolean;
    canGetDatafeeds: boolean;
    canStartStopDatafeed: boolean;
    canUpdateJob: boolean;
    canUpdateDatafeed: boolean;
    canPreviewDatafeed: boolean;
    canGetCalendars: boolean;
    canCreateCalendar: boolean;
    canDeleteCalendar: boolean;
    canGetFilters: boolean;
    canCreateFilter: boolean;
    canDeleteFilter: boolean;
    canFindFileStructure: boolean;
    canGetDataFrame: boolean;
    canDeleteDataFrame: boolean;
    canPreviewDataFrame: boolean;
    canCreateDataFrame: boolean;
    canStartStopDataFrame: boolean;
    canGetDataFrameAnalytics: boolean;
    canDeleteDataFrameAnalytics: boolean;
    canCreateDataFrameAnalytics: boolean;
    canStartStopDataFrameAnalytics: boolean;
  };
  isPlatinumOrTrialLicense: boolean;
  mlFeatureEnabledInSpace: boolean;
  upgradeInProgress: boolean;
}

const sourceOrDestination = ['source.ip', 'destination.ip'];

export const isDestinationOrSource = (value: string | null): value is DestinationOrSource =>
  value != null && sourceOrDestination.includes(value);

export interface MlError {
  msg: string;
  response: string;
  statusCode: number;
  path?: string;
  query?: {};
  body?: string;
}
