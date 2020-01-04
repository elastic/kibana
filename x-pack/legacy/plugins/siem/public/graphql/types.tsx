/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
*/

/* tslint:disable */
/* eslint-disable */

import gql from 'graphql-tag';
import * as React from 'react';
import * as ApolloReactCommon from '@apollo/react-common';
import * as ApolloReactComponents from '@apollo/react-components';
import * as ApolloReactHooks from '@apollo/client';
export type Maybe<T> = T | null;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string,
  String: string,
  Boolean: boolean,
  Int: number,
  Float: number,
  ToStringArray: string[],
  Date: string,
  ToNumberArray: number[],
  ToDateArray: string[],
  ToBooleanArray: boolean[],
  EsValue: any,
};

export type AlertsOverTimeData = {
   __typename?: 'AlertsOverTimeData',
  inspect?: Maybe<Inspect>,
  alertsOverTimeByModule: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
};

export type AnomaliesOverTimeData = {
   __typename?: 'AnomaliesOverTimeData',
  inspect?: Maybe<Inspect>,
  anomaliesOverTime: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
};

export type AuditdData = {
   __typename?: 'AuditdData',
  acct?: Maybe<Scalars['ToStringArray']>,
  terminal?: Maybe<Scalars['ToStringArray']>,
  op?: Maybe<Scalars['ToStringArray']>,
};

export type AuditdEcsFields = {
   __typename?: 'AuditdEcsFields',
  result?: Maybe<Scalars['ToStringArray']>,
  session?: Maybe<Scalars['ToStringArray']>,
  data?: Maybe<AuditdData>,
  summary?: Maybe<Summary>,
  sequence?: Maybe<Scalars['ToStringArray']>,
};

export type AuditEcsFields = {
   __typename?: 'AuditEcsFields',
  package?: Maybe<PackageEcsFields>,
};

export type AuthEcsFields = {
   __typename?: 'AuthEcsFields',
  ssh?: Maybe<SshEcsFields>,
};

export type AuthenticationItem = {
   __typename?: 'AuthenticationItem',
  _id: Scalars['String'],
  failures: Scalars['Float'],
  successes: Scalars['Float'],
  user: UserEcsFields,
  lastSuccess?: Maybe<LastSourceHost>,
  lastFailure?: Maybe<LastSourceHost>,
};

export type AuthenticationsData = {
   __typename?: 'AuthenticationsData',
  edges: Array<AuthenticationsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type AuthenticationsEdges = {
   __typename?: 'AuthenticationsEdges',
  node: AuthenticationItem,
  cursor: CursorType,
};

export type AuthenticationsOverTimeData = {
   __typename?: 'AuthenticationsOverTimeData',
  inspect?: Maybe<Inspect>,
  authenticationsOverTime: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
};

export type AutonomousSystem = {
   __typename?: 'AutonomousSystem',
  number?: Maybe<Scalars['Float']>,
  organization?: Maybe<AutonomousSystemOrganization>,
};

export type AutonomousSystemItem = {
   __typename?: 'AutonomousSystemItem',
  name?: Maybe<Scalars['String']>,
  number?: Maybe<Scalars['Float']>,
};

export type AutonomousSystemOrganization = {
   __typename?: 'AutonomousSystemOrganization',
  name?: Maybe<Scalars['String']>,
};

export type CloudFields = {
   __typename?: 'CloudFields',
  instance?: Maybe<CloudInstance>,
  machine?: Maybe<CloudMachine>,
  provider?: Maybe<Array<Maybe<Scalars['String']>>>,
  region?: Maybe<Array<Maybe<Scalars['String']>>>,
};

export type CloudInstance = {
   __typename?: 'CloudInstance',
  id?: Maybe<Array<Maybe<Scalars['String']>>>,
};

export type CloudMachine = {
   __typename?: 'CloudMachine',
  type?: Maybe<Array<Maybe<Scalars['String']>>>,
};

export type ColumnHeaderInput = {
  aggregatable?: Maybe<Scalars['Boolean']>,
  category?: Maybe<Scalars['String']>,
  columnHeaderType?: Maybe<Scalars['String']>,
  description?: Maybe<Scalars['String']>,
  example?: Maybe<Scalars['String']>,
  indexes?: Maybe<Array<Scalars['String']>>,
  id?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  placeholder?: Maybe<Scalars['String']>,
  searchable?: Maybe<Scalars['Boolean']>,
  type?: Maybe<Scalars['String']>,
};

export type ColumnHeaderResult = {
   __typename?: 'ColumnHeaderResult',
  aggregatable?: Maybe<Scalars['Boolean']>,
  category?: Maybe<Scalars['String']>,
  columnHeaderType?: Maybe<Scalars['String']>,
  description?: Maybe<Scalars['String']>,
  example?: Maybe<Scalars['String']>,
  indexes?: Maybe<Array<Scalars['String']>>,
  id?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  placeholder?: Maybe<Scalars['String']>,
  searchable?: Maybe<Scalars['Boolean']>,
  type?: Maybe<Scalars['String']>,
};

export type CursorType = {
   __typename?: 'CursorType',
  value?: Maybe<Scalars['String']>,
  tiebreaker?: Maybe<Scalars['String']>,
};

export type DataProviderInput = {
  id?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  enabled?: Maybe<Scalars['Boolean']>,
  excluded?: Maybe<Scalars['Boolean']>,
  kqlQuery?: Maybe<Scalars['String']>,
  queryMatch?: Maybe<QueryMatchInput>,
  and?: Maybe<Array<DataProviderInput>>,
};

export type DataProviderResult = {
   __typename?: 'DataProviderResult',
  id?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  enabled?: Maybe<Scalars['Boolean']>,
  excluded?: Maybe<Scalars['Boolean']>,
  kqlQuery?: Maybe<Scalars['String']>,
  queryMatch?: Maybe<QueryMatchResult>,
  and?: Maybe<Array<DataProviderResult>>,
};


export type DateRangePickerInput = {
  start?: Maybe<Scalars['Float']>,
  end?: Maybe<Scalars['Float']>,
};

export type DateRangePickerResult = {
   __typename?: 'DateRangePickerResult',
  start?: Maybe<Scalars['Float']>,
  end?: Maybe<Scalars['Float']>,
};

export type DestinationEcsFields = {
   __typename?: 'DestinationEcsFields',
  bytes?: Maybe<Scalars['ToNumberArray']>,
  ip?: Maybe<Scalars['ToStringArray']>,
  port?: Maybe<Scalars['ToNumberArray']>,
  domain?: Maybe<Scalars['ToStringArray']>,
  geo?: Maybe<GeoEcsFields>,
  packets?: Maybe<Scalars['ToNumberArray']>,
};

export type DetailItem = {
   __typename?: 'DetailItem',
  field: Scalars['String'],
  values?: Maybe<Scalars['ToStringArray']>,
  originalValue?: Maybe<Scalars['EsValue']>,
};

export enum Direction {
  asc = 'asc',
  desc = 'desc'
}

export type DnsEcsFields = {
   __typename?: 'DnsEcsFields',
  question?: Maybe<DnsQuestionData>,
  resolved_ip?: Maybe<Scalars['ToStringArray']>,
  response_code?: Maybe<Scalars['ToStringArray']>,
};

export type DnsQuestionData = {
   __typename?: 'DnsQuestionData',
  name?: Maybe<Scalars['ToStringArray']>,
  type?: Maybe<Scalars['ToStringArray']>,
};

export type Ecs = {
   __typename?: 'ECS',
  _id: Scalars['String'],
  _index?: Maybe<Scalars['String']>,
  auditd?: Maybe<AuditdEcsFields>,
  destination?: Maybe<DestinationEcsFields>,
  dns?: Maybe<DnsEcsFields>,
  endgame?: Maybe<EndgameEcsFields>,
  event?: Maybe<EventEcsFields>,
  geo?: Maybe<GeoEcsFields>,
  host?: Maybe<HostEcsFields>,
  network?: Maybe<NetworkEcsField>,
  source?: Maybe<SourceEcsFields>,
  suricata?: Maybe<SuricataEcsFields>,
  tls?: Maybe<TlsEcsFields>,
  zeek?: Maybe<ZeekEcsFields>,
  http?: Maybe<HttpEcsFields>,
  url?: Maybe<UrlEcsFields>,
  timestamp?: Maybe<Scalars['Date']>,
  message?: Maybe<Scalars['ToStringArray']>,
  user?: Maybe<UserEcsFields>,
  winlog?: Maybe<WinlogEcsFields>,
  process?: Maybe<ProcessEcsFields>,
  file?: Maybe<FileFields>,
  system?: Maybe<SystemEcsField>,
};

export type EcsEdges = {
   __typename?: 'EcsEdges',
  node: Ecs,
  cursor: CursorType,
};

export type EndgameEcsFields = {
   __typename?: 'EndgameEcsFields',
  exit_code?: Maybe<Scalars['ToNumberArray']>,
  file_name?: Maybe<Scalars['ToStringArray']>,
  file_path?: Maybe<Scalars['ToStringArray']>,
  logon_type?: Maybe<Scalars['ToNumberArray']>,
  parent_process_name?: Maybe<Scalars['ToStringArray']>,
  pid?: Maybe<Scalars['ToNumberArray']>,
  process_name?: Maybe<Scalars['ToStringArray']>,
  subject_domain_name?: Maybe<Scalars['ToStringArray']>,
  subject_logon_id?: Maybe<Scalars['ToStringArray']>,
  subject_user_name?: Maybe<Scalars['ToStringArray']>,
  target_domain_name?: Maybe<Scalars['ToStringArray']>,
  target_logon_id?: Maybe<Scalars['ToStringArray']>,
  target_user_name?: Maybe<Scalars['ToStringArray']>,
};


export type EventEcsFields = {
   __typename?: 'EventEcsFields',
  action?: Maybe<Scalars['ToStringArray']>,
  category?: Maybe<Scalars['ToStringArray']>,
  code?: Maybe<Scalars['ToStringArray']>,
  created?: Maybe<Scalars['ToDateArray']>,
  dataset?: Maybe<Scalars['ToStringArray']>,
  duration?: Maybe<Scalars['ToNumberArray']>,
  end?: Maybe<Scalars['ToDateArray']>,
  hash?: Maybe<Scalars['ToStringArray']>,
  id?: Maybe<Scalars['ToStringArray']>,
  kind?: Maybe<Scalars['ToStringArray']>,
  module?: Maybe<Scalars['ToStringArray']>,
  original?: Maybe<Scalars['ToStringArray']>,
  outcome?: Maybe<Scalars['ToStringArray']>,
  risk_score?: Maybe<Scalars['ToNumberArray']>,
  risk_score_norm?: Maybe<Scalars['ToNumberArray']>,
  severity?: Maybe<Scalars['ToNumberArray']>,
  start?: Maybe<Scalars['ToDateArray']>,
  timezone?: Maybe<Scalars['ToStringArray']>,
  type?: Maybe<Scalars['ToStringArray']>,
};

export type EventsOverTimeData = {
   __typename?: 'EventsOverTimeData',
  inspect?: Maybe<Inspect>,
  eventsOverTime: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
};

export type EventsTimelineData = {
   __typename?: 'EventsTimelineData',
  edges: Array<EcsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfo,
  inspect?: Maybe<Inspect>,
};

export type FavoriteTimelineInput = {
  fullName?: Maybe<Scalars['String']>,
  userName?: Maybe<Scalars['String']>,
  favoriteDate?: Maybe<Scalars['Float']>,
};

export type FavoriteTimelineResult = {
   __typename?: 'FavoriteTimelineResult',
  fullName?: Maybe<Scalars['String']>,
  userName?: Maybe<Scalars['String']>,
  favoriteDate?: Maybe<Scalars['Float']>,
};

export type FileFields = {
   __typename?: 'FileFields',
  name?: Maybe<Scalars['ToStringArray']>,
  path?: Maybe<Scalars['ToStringArray']>,
  target_path?: Maybe<Scalars['ToStringArray']>,
  extension?: Maybe<Scalars['ToStringArray']>,
  type?: Maybe<Scalars['ToStringArray']>,
  device?: Maybe<Scalars['ToStringArray']>,
  inode?: Maybe<Scalars['ToStringArray']>,
  uid?: Maybe<Scalars['ToStringArray']>,
  owner?: Maybe<Scalars['ToStringArray']>,
  gid?: Maybe<Scalars['ToStringArray']>,
  group?: Maybe<Scalars['ToStringArray']>,
  mode?: Maybe<Scalars['ToStringArray']>,
  size?: Maybe<Scalars['ToNumberArray']>,
  mtime?: Maybe<Scalars['ToDateArray']>,
  ctime?: Maybe<Scalars['ToDateArray']>,
};

export type FilterMetaTimelineInput = {
  alias?: Maybe<Scalars['String']>,
  controlledBy?: Maybe<Scalars['String']>,
  disabled?: Maybe<Scalars['Boolean']>,
  field?: Maybe<Scalars['String']>,
  formattedValue?: Maybe<Scalars['String']>,
  index?: Maybe<Scalars['String']>,
  key?: Maybe<Scalars['String']>,
  negate?: Maybe<Scalars['Boolean']>,
  params?: Maybe<Scalars['String']>,
  type?: Maybe<Scalars['String']>,
  value?: Maybe<Scalars['String']>,
};

export type FilterMetaTimelineResult = {
   __typename?: 'FilterMetaTimelineResult',
  alias?: Maybe<Scalars['String']>,
  controlledBy?: Maybe<Scalars['String']>,
  disabled?: Maybe<Scalars['Boolean']>,
  field?: Maybe<Scalars['String']>,
  formattedValue?: Maybe<Scalars['String']>,
  index?: Maybe<Scalars['String']>,
  key?: Maybe<Scalars['String']>,
  negate?: Maybe<Scalars['Boolean']>,
  params?: Maybe<Scalars['String']>,
  type?: Maybe<Scalars['String']>,
  value?: Maybe<Scalars['String']>,
};

export type FilterTimelineInput = {
  exists?: Maybe<Scalars['String']>,
  meta?: Maybe<FilterMetaTimelineInput>,
  match_all?: Maybe<Scalars['String']>,
  missing?: Maybe<Scalars['String']>,
  query?: Maybe<Scalars['String']>,
  range?: Maybe<Scalars['String']>,
  script?: Maybe<Scalars['String']>,
};

export type FilterTimelineResult = {
   __typename?: 'FilterTimelineResult',
  exists?: Maybe<Scalars['String']>,
  meta?: Maybe<FilterMetaTimelineResult>,
  match_all?: Maybe<Scalars['String']>,
  missing?: Maybe<Scalars['String']>,
  query?: Maybe<Scalars['String']>,
  range?: Maybe<Scalars['String']>,
  script?: Maybe<Scalars['String']>,
};

export type FingerprintData = {
   __typename?: 'FingerprintData',
  sha1?: Maybe<Scalars['ToStringArray']>,
};

export type FirstLastSeenHost = {
   __typename?: 'FirstLastSeenHost',
  inspect?: Maybe<Inspect>,
  firstSeen?: Maybe<Scalars['Date']>,
  lastSeen?: Maybe<Scalars['Date']>,
};

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional'
}

export enum FlowTarget {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source'
}

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source'
}

export type GeoEcsFields = {
   __typename?: 'GeoEcsFields',
  city_name?: Maybe<Scalars['ToStringArray']>,
  continent_name?: Maybe<Scalars['ToStringArray']>,
  country_iso_code?: Maybe<Scalars['ToStringArray']>,
  country_name?: Maybe<Scalars['ToStringArray']>,
  location?: Maybe<Location>,
  region_iso_code?: Maybe<Scalars['ToStringArray']>,
  region_name?: Maybe<Scalars['ToStringArray']>,
};

export type GeoItem = {
   __typename?: 'GeoItem',
  geo?: Maybe<GeoEcsFields>,
  flowTarget?: Maybe<FlowTargetSourceDest>,
};

export type HostEcsFields = {
   __typename?: 'HostEcsFields',
  architecture?: Maybe<Scalars['ToStringArray']>,
  id?: Maybe<Scalars['ToStringArray']>,
  ip?: Maybe<Scalars['ToStringArray']>,
  mac?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  os?: Maybe<OsEcsFields>,
  type?: Maybe<Scalars['ToStringArray']>,
};

export type HostFields = {
   __typename?: 'HostFields',
  architecture?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  ip?: Maybe<Array<Maybe<Scalars['String']>>>,
  mac?: Maybe<Array<Maybe<Scalars['String']>>>,
  name?: Maybe<Scalars['String']>,
  os?: Maybe<OsFields>,
  type?: Maybe<Scalars['String']>,
};

export type HostItem = {
   __typename?: 'HostItem',
  _id?: Maybe<Scalars['String']>,
  lastSeen?: Maybe<Scalars['Date']>,
  host?: Maybe<HostEcsFields>,
  cloud?: Maybe<CloudFields>,
  inspect?: Maybe<Inspect>,
};

export type HostsData = {
   __typename?: 'HostsData',
  edges: Array<HostsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type HostsEdges = {
   __typename?: 'HostsEdges',
  node: HostItem,
  cursor: CursorType,
};

export enum HostsFields {
  hostName = 'hostName',
  lastSeen = 'lastSeen'
}

export type HostsSortField = {
  field: HostsFields,
  direction: Direction,
};

export type HttpBodyData = {
   __typename?: 'HttpBodyData',
  content?: Maybe<Scalars['ToStringArray']>,
  bytes?: Maybe<Scalars['ToNumberArray']>,
};

export type HttpEcsFields = {
   __typename?: 'HttpEcsFields',
  version?: Maybe<Scalars['ToStringArray']>,
  request?: Maybe<HttpRequestData>,
  response?: Maybe<HttpResponseData>,
};

export type HttpRequestData = {
   __typename?: 'HttpRequestData',
  method?: Maybe<Scalars['ToStringArray']>,
  body?: Maybe<HttpBodyData>,
  referrer?: Maybe<Scalars['ToStringArray']>,
  bytes?: Maybe<Scalars['ToNumberArray']>,
};

export type HttpResponseData = {
   __typename?: 'HttpResponseData',
  status_code?: Maybe<Scalars['ToNumberArray']>,
  body?: Maybe<HttpBodyData>,
  bytes?: Maybe<Scalars['ToNumberArray']>,
};

/** A descriptor of a field in an index */
export type IndexField = {
   __typename?: 'IndexField',
  /** Where the field belong */
  category: Scalars['String'],
  /** Example of field's value */
  example?: Maybe<Scalars['String']>,
  /** whether the field's belong to an alias index */
  indexes: Array<Maybe<Scalars['String']>>,
  /** The name of the field */
  name: Scalars['String'],
  /** The type of the field's values as recognized by Kibana */
  type: Scalars['String'],
  /** Whether the field's values can be efficiently searched for */
  searchable: Scalars['Boolean'],
  /** Whether the field's values can be aggregated */
  aggregatable: Scalars['Boolean'],
  /** Description of the field */
  description?: Maybe<Scalars['String']>,
  format?: Maybe<Scalars['String']>,
};

export type Inspect = {
   __typename?: 'Inspect',
  dsl: Array<Scalars['String']>,
  response: Array<Scalars['String']>,
};

export type IpOverviewData = {
   __typename?: 'IpOverviewData',
  client?: Maybe<Overview>,
  destination?: Maybe<Overview>,
  host: HostEcsFields,
  server?: Maybe<Overview>,
  source?: Maybe<Overview>,
  inspect?: Maybe<Inspect>,
};

export type KpiHostDetailsData = {
   __typename?: 'KpiHostDetailsData',
  authSuccess?: Maybe<Scalars['Float']>,
  authSuccessHistogram?: Maybe<Array<KpiHostHistogramData>>,
  authFailure?: Maybe<Scalars['Float']>,
  authFailureHistogram?: Maybe<Array<KpiHostHistogramData>>,
  uniqueSourceIps?: Maybe<Scalars['Float']>,
  uniqueSourceIpsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  uniqueDestinationIps?: Maybe<Scalars['Float']>,
  uniqueDestinationIpsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  inspect?: Maybe<Inspect>,
};

export type KpiHostHistogramData = {
   __typename?: 'KpiHostHistogramData',
  x?: Maybe<Scalars['Float']>,
  y?: Maybe<Scalars['Float']>,
};

export type KpiHostsData = {
   __typename?: 'KpiHostsData',
  hosts?: Maybe<Scalars['Float']>,
  hostsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  authSuccess?: Maybe<Scalars['Float']>,
  authSuccessHistogram?: Maybe<Array<KpiHostHistogramData>>,
  authFailure?: Maybe<Scalars['Float']>,
  authFailureHistogram?: Maybe<Array<KpiHostHistogramData>>,
  uniqueSourceIps?: Maybe<Scalars['Float']>,
  uniqueSourceIpsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  uniqueDestinationIps?: Maybe<Scalars['Float']>,
  uniqueDestinationIpsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  inspect?: Maybe<Inspect>,
};

export type KpiNetworkData = {
   __typename?: 'KpiNetworkData',
  networkEvents?: Maybe<Scalars['Float']>,
  uniqueFlowId?: Maybe<Scalars['Float']>,
  uniqueSourcePrivateIps?: Maybe<Scalars['Float']>,
  uniqueSourcePrivateIpsHistogram?: Maybe<Array<KpiNetworkHistogramData>>,
  uniqueDestinationPrivateIps?: Maybe<Scalars['Float']>,
  uniqueDestinationPrivateIpsHistogram?: Maybe<Array<KpiNetworkHistogramData>>,
  dnsQueries?: Maybe<Scalars['Float']>,
  tlsHandshakes?: Maybe<Scalars['Float']>,
  inspect?: Maybe<Inspect>,
};

export type KpiNetworkHistogramData = {
   __typename?: 'KpiNetworkHistogramData',
  x?: Maybe<Scalars['Float']>,
  y?: Maybe<Scalars['Float']>,
};

export type KueryFilterQueryInput = {
  kind?: Maybe<Scalars['String']>,
  expression?: Maybe<Scalars['String']>,
};

export type KueryFilterQueryResult = {
   __typename?: 'KueryFilterQueryResult',
  kind?: Maybe<Scalars['String']>,
  expression?: Maybe<Scalars['String']>,
};

export enum LastEventIndexKey {
  hostDetails = 'hostDetails',
  hosts = 'hosts',
  ipDetails = 'ipDetails',
  network = 'network'
}

export type LastEventTimeData = {
   __typename?: 'LastEventTimeData',
  lastSeen?: Maybe<Scalars['Date']>,
  inspect?: Maybe<Inspect>,
};

export type LastSourceHost = {
   __typename?: 'LastSourceHost',
  timestamp?: Maybe<Scalars['Date']>,
  source?: Maybe<SourceEcsFields>,
  host?: Maybe<HostEcsFields>,
};

export type LastTimeDetails = {
  hostName?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
};

export type Location = {
   __typename?: 'Location',
  lon?: Maybe<Scalars['ToNumberArray']>,
  lat?: Maybe<Scalars['ToNumberArray']>,
};

export type MatrixOverOrdinalHistogramData = {
   __typename?: 'MatrixOverOrdinalHistogramData',
  x: Scalars['String'],
  y: Scalars['Float'],
  g: Scalars['String'],
};

export type MatrixOverTimeHistogramData = {
   __typename?: 'MatrixOverTimeHistogramData',
  x: Scalars['Float'],
  y: Scalars['Float'],
  g: Scalars['String'],
};

export type Mutation = {
   __typename?: 'Mutation',
  /** Persists a note */
  persistNote: ResponseNote,
  deleteNote?: Maybe<Scalars['Boolean']>,
  deleteNoteByTimelineId?: Maybe<Scalars['Boolean']>,
  /** Persists a pinned event in a timeline */
  persistPinnedEventOnTimeline?: Maybe<PinnedEvent>,
  /** Remove a pinned events in a timeline */
  deletePinnedEventOnTimeline: Scalars['Boolean'],
  /** Remove all pinned events in a timeline */
  deleteAllPinnedEventsOnTimeline: Scalars['Boolean'],
  /** Persists a timeline */
  persistTimeline: ResponseTimeline,
  persistFavorite: ResponseFavoriteTimeline,
  deleteTimeline: Scalars['Boolean'],
};


export type MutationPersistNoteArgs = {
  noteId?: Maybe<Scalars['ID']>,
  version?: Maybe<Scalars['String']>,
  note: NoteInput
};


export type MutationDeleteNoteArgs = {
  id: Array<Scalars['ID']>
};


export type MutationDeleteNoteByTimelineIdArgs = {
  timelineId: Scalars['ID'],
  version?: Maybe<Scalars['String']>
};


export type MutationPersistPinnedEventOnTimelineArgs = {
  pinnedEventId?: Maybe<Scalars['ID']>,
  eventId: Scalars['ID'],
  timelineId?: Maybe<Scalars['ID']>
};


export type MutationDeletePinnedEventOnTimelineArgs = {
  id: Array<Scalars['ID']>
};


export type MutationDeleteAllPinnedEventsOnTimelineArgs = {
  timelineId: Scalars['ID']
};


export type MutationPersistTimelineArgs = {
  id?: Maybe<Scalars['ID']>,
  version?: Maybe<Scalars['String']>,
  timeline: TimelineInput
};


export type MutationPersistFavoriteArgs = {
  timelineId?: Maybe<Scalars['ID']>
};


export type MutationDeleteTimelineArgs = {
  id: Array<Scalars['ID']>
};

export enum NetworkDirectionEcs {
  inbound = 'inbound',
  outbound = 'outbound',
  internal = 'internal',
  external = 'external',
  incoming = 'incoming',
  outgoing = 'outgoing',
  listening = 'listening',
  unknown = 'unknown'
}

export type NetworkDnsData = {
   __typename?: 'NetworkDnsData',
  edges: Array<NetworkDnsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
  histogram?: Maybe<Array<MatrixOverOrdinalHistogramData>>,
};

export type NetworkDnsEdges = {
   __typename?: 'NetworkDnsEdges',
  node: NetworkDnsItem,
  cursor: CursorType,
};

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut'
}

export type NetworkDnsItem = {
   __typename?: 'NetworkDnsItem',
  _id?: Maybe<Scalars['String']>,
  dnsBytesIn?: Maybe<Scalars['Float']>,
  dnsBytesOut?: Maybe<Scalars['Float']>,
  dnsName?: Maybe<Scalars['String']>,
  queryCount?: Maybe<Scalars['Float']>,
  uniqueDomains?: Maybe<Scalars['Float']>,
};

export type NetworkDnsSortField = {
  field: NetworkDnsFields,
  direction: Direction,
};

export type NetworkEcsField = {
   __typename?: 'NetworkEcsField',
  bytes?: Maybe<Scalars['ToNumberArray']>,
  community_id?: Maybe<Scalars['ToStringArray']>,
  direction?: Maybe<Scalars['ToStringArray']>,
  packets?: Maybe<Scalars['ToNumberArray']>,
  protocol?: Maybe<Scalars['ToStringArray']>,
  transport?: Maybe<Scalars['ToStringArray']>,
};

export type NetworkHttpData = {
   __typename?: 'NetworkHttpData',
  edges: Array<NetworkHttpEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type NetworkHttpEdges = {
   __typename?: 'NetworkHttpEdges',
  node: NetworkHttpItem,
  cursor: CursorType,
};

export enum NetworkHttpFields {
  domains = 'domains',
  lastHost = 'lastHost',
  lastSourceIp = 'lastSourceIp',
  methods = 'methods',
  path = 'path',
  requestCount = 'requestCount',
  statuses = 'statuses'
}

export type NetworkHttpItem = {
   __typename?: 'NetworkHttpItem',
  _id?: Maybe<Scalars['String']>,
  domains: Array<Scalars['String']>,
  lastHost?: Maybe<Scalars['String']>,
  lastSourceIp?: Maybe<Scalars['String']>,
  methods: Array<Scalars['String']>,
  path?: Maybe<Scalars['String']>,
  requestCount?: Maybe<Scalars['Float']>,
  statuses: Array<Scalars['String']>,
};

export type NetworkHttpSortField = {
  direction: Direction,
};

export type NetworkTopCountriesData = {
   __typename?: 'NetworkTopCountriesData',
  edges: Array<NetworkTopCountriesEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type NetworkTopCountriesEdges = {
   __typename?: 'NetworkTopCountriesEdges',
  node: NetworkTopCountriesItem,
  cursor: CursorType,
};

export type NetworkTopCountriesItem = {
   __typename?: 'NetworkTopCountriesItem',
  _id?: Maybe<Scalars['String']>,
  source?: Maybe<TopCountriesItemSource>,
  destination?: Maybe<TopCountriesItemDestination>,
  network?: Maybe<TopNetworkTablesEcsField>,
};

export type NetworkTopNFlowData = {
   __typename?: 'NetworkTopNFlowData',
  edges: Array<NetworkTopNFlowEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type NetworkTopNFlowEdges = {
   __typename?: 'NetworkTopNFlowEdges',
  node: NetworkTopNFlowItem,
  cursor: CursorType,
};

export type NetworkTopNFlowItem = {
   __typename?: 'NetworkTopNFlowItem',
  _id?: Maybe<Scalars['String']>,
  source?: Maybe<TopNFlowItemSource>,
  destination?: Maybe<TopNFlowItemDestination>,
  network?: Maybe<TopNetworkTablesEcsField>,
};

export enum NetworkTopTablesFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips'
}

export type NetworkTopTablesSortField = {
  field: NetworkTopTablesFields,
  direction: Direction,
};

export type NoteInput = {
  eventId?: Maybe<Scalars['String']>,
  note?: Maybe<Scalars['String']>,
  timelineId?: Maybe<Scalars['String']>,
};

export type NoteResult = {
   __typename?: 'NoteResult',
  eventId?: Maybe<Scalars['String']>,
  note?: Maybe<Scalars['String']>,
  timelineId?: Maybe<Scalars['String']>,
  noteId: Scalars['String'],
  created?: Maybe<Scalars['Float']>,
  createdBy?: Maybe<Scalars['String']>,
  timelineVersion?: Maybe<Scalars['String']>,
  updated?: Maybe<Scalars['Float']>,
  updatedBy?: Maybe<Scalars['String']>,
  version?: Maybe<Scalars['String']>,
};

export type OsEcsFields = {
   __typename?: 'OsEcsFields',
  platform?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  full?: Maybe<Scalars['ToStringArray']>,
  family?: Maybe<Scalars['ToStringArray']>,
  version?: Maybe<Scalars['ToStringArray']>,
  kernel?: Maybe<Scalars['ToStringArray']>,
};

export type OsFields = {
   __typename?: 'OsFields',
  platform?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  full?: Maybe<Scalars['String']>,
  family?: Maybe<Scalars['String']>,
  version?: Maybe<Scalars['String']>,
  kernel?: Maybe<Scalars['String']>,
};

export type Overview = {
   __typename?: 'Overview',
  firstSeen?: Maybe<Scalars['Date']>,
  lastSeen?: Maybe<Scalars['Date']>,
  autonomousSystem: AutonomousSystem,
  geo: GeoEcsFields,
};

export type OverviewHostData = {
   __typename?: 'OverviewHostData',
  auditbeatAuditd?: Maybe<Scalars['Float']>,
  auditbeatFIM?: Maybe<Scalars['Float']>,
  auditbeatLogin?: Maybe<Scalars['Float']>,
  auditbeatPackage?: Maybe<Scalars['Float']>,
  auditbeatProcess?: Maybe<Scalars['Float']>,
  auditbeatUser?: Maybe<Scalars['Float']>,
  endgameDns?: Maybe<Scalars['Float']>,
  endgameFile?: Maybe<Scalars['Float']>,
  endgameImageLoad?: Maybe<Scalars['Float']>,
  endgameNetwork?: Maybe<Scalars['Float']>,
  endgameProcess?: Maybe<Scalars['Float']>,
  endgameRegistry?: Maybe<Scalars['Float']>,
  endgameSecurity?: Maybe<Scalars['Float']>,
  filebeatSystemModule?: Maybe<Scalars['Float']>,
  winlogbeat?: Maybe<Scalars['Float']>,
  inspect?: Maybe<Inspect>,
};

export type OverviewNetworkData = {
   __typename?: 'OverviewNetworkData',
  auditbeatSocket?: Maybe<Scalars['Float']>,
  filebeatCisco?: Maybe<Scalars['Float']>,
  filebeatNetflow?: Maybe<Scalars['Float']>,
  filebeatPanw?: Maybe<Scalars['Float']>,
  filebeatSuricata?: Maybe<Scalars['Float']>,
  filebeatZeek?: Maybe<Scalars['Float']>,
  packetbeatDNS?: Maybe<Scalars['Float']>,
  packetbeatFlow?: Maybe<Scalars['Float']>,
  packetbeatTLS?: Maybe<Scalars['Float']>,
  inspect?: Maybe<Inspect>,
};

export type PackageEcsFields = {
   __typename?: 'PackageEcsFields',
  arch?: Maybe<Scalars['ToStringArray']>,
  entity_id?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  size?: Maybe<Scalars['ToNumberArray']>,
  summary?: Maybe<Scalars['ToStringArray']>,
  version?: Maybe<Scalars['ToStringArray']>,
};

export type PageInfo = {
   __typename?: 'PageInfo',
  endCursor?: Maybe<CursorType>,
  hasNextPage?: Maybe<Scalars['Boolean']>,
};

export type PageInfoNote = {
  pageIndex: Scalars['Float'],
  pageSize: Scalars['Float'],
};

export type PageInfoPaginated = {
   __typename?: 'PageInfoPaginated',
  activePage: Scalars['Float'],
  fakeTotalCount: Scalars['Float'],
  showMorePagesIndicator: Scalars['Boolean'],
};

export type PageInfoTimeline = {
  pageIndex: Scalars['Float'],
  pageSize: Scalars['Float'],
};

export type PaginationInput = {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: Scalars['Float'],
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<Scalars['String']>,
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<Scalars['String']>,
};

export type PaginationInputPaginated = {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: Scalars['Float'],
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: Scalars['Float'],
  /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
  fakePossibleCount: Scalars['Float'],
  /** The querySize parameter is the number of items to be returned */
  querySize: Scalars['Float'],
};

export type PinnedEvent = {
   __typename?: 'PinnedEvent',
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  pinnedEventId: Scalars['ID'],
  eventId?: Maybe<Scalars['ID']>,
  timelineId?: Maybe<Scalars['ID']>,
  timelineVersion?: Maybe<Scalars['String']>,
  created?: Maybe<Scalars['Float']>,
  createdBy?: Maybe<Scalars['String']>,
  updated?: Maybe<Scalars['Float']>,
  updatedBy?: Maybe<Scalars['String']>,
  version?: Maybe<Scalars['String']>,
};

export type PrimarySecondary = {
   __typename?: 'PrimarySecondary',
  primary?: Maybe<Scalars['ToStringArray']>,
  secondary?: Maybe<Scalars['ToStringArray']>,
  type?: Maybe<Scalars['ToStringArray']>,
};

export type ProcessEcsFields = {
   __typename?: 'ProcessEcsFields',
  hash?: Maybe<ProcessHashData>,
  pid?: Maybe<Scalars['ToNumberArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  ppid?: Maybe<Scalars['ToNumberArray']>,
  args?: Maybe<Scalars['ToStringArray']>,
  executable?: Maybe<Scalars['ToStringArray']>,
  title?: Maybe<Scalars['ToStringArray']>,
  thread?: Maybe<Thread>,
  working_directory?: Maybe<Scalars['ToStringArray']>,
};

export type ProcessHashData = {
   __typename?: 'ProcessHashData',
  md5?: Maybe<Scalars['ToStringArray']>,
  sha1?: Maybe<Scalars['ToStringArray']>,
  sha256?: Maybe<Scalars['ToStringArray']>,
};

export type Query = {
   __typename?: 'Query',
  getNote: NoteResult,
  getNotesByTimelineId: Array<NoteResult>,
  getNotesByEventId: Array<NoteResult>,
  getAllNotes: ResponseNotes,
  getAllPinnedEventsByTimelineId: Array<PinnedEvent>,
  /** Get a security data source by id */
  source: Source,
  /** Get a list of all security data sources */
  allSources: Array<Source>,
  getOneTimeline: TimelineResult,
  getAllTimeline: ResponseTimelines,
};


export type QueryGetNoteArgs = {
  id: Scalars['ID']
};


export type QueryGetNotesByTimelineIdArgs = {
  timelineId: Scalars['ID']
};


export type QueryGetNotesByEventIdArgs = {
  eventId: Scalars['ID']
};


export type QueryGetAllNotesArgs = {
  pageInfo?: Maybe<PageInfoNote>,
  search?: Maybe<Scalars['String']>,
  sort?: Maybe<SortNote>
};


export type QueryGetAllPinnedEventsByTimelineIdArgs = {
  timelineId: Scalars['ID']
};


export type QuerySourceArgs = {
  id: Scalars['ID']
};


export type QueryGetOneTimelineArgs = {
  id: Scalars['ID']
};


export type QueryGetAllTimelineArgs = {
  pageInfo?: Maybe<PageInfoTimeline>,
  search?: Maybe<Scalars['String']>,
  sort?: Maybe<SortTimeline>,
  onlyUserFavorite?: Maybe<Scalars['Boolean']>
};

export type QueryMatchInput = {
  field?: Maybe<Scalars['String']>,
  displayField?: Maybe<Scalars['String']>,
  value?: Maybe<Scalars['String']>,
  displayValue?: Maybe<Scalars['String']>,
  operator?: Maybe<Scalars['String']>,
};

export type QueryMatchResult = {
   __typename?: 'QueryMatchResult',
  field?: Maybe<Scalars['String']>,
  displayField?: Maybe<Scalars['String']>,
  value?: Maybe<Scalars['String']>,
  displayValue?: Maybe<Scalars['String']>,
  operator?: Maybe<Scalars['String']>,
};

export type ResponseFavoriteTimeline = {
   __typename?: 'ResponseFavoriteTimeline',
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  savedObjectId: Scalars['String'],
  version: Scalars['String'],
  favorite?: Maybe<Array<FavoriteTimelineResult>>,
};

export type ResponseNote = {
   __typename?: 'ResponseNote',
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  note: NoteResult,
};

export type ResponseNotes = {
   __typename?: 'ResponseNotes',
  notes: Array<NoteResult>,
  totalCount?: Maybe<Scalars['Float']>,
};

export type ResponseTimeline = {
   __typename?: 'ResponseTimeline',
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  timeline: TimelineResult,
};

export type ResponseTimelines = {
   __typename?: 'ResponseTimelines',
  timeline: Array<Maybe<TimelineResult>>,
  totalCount?: Maybe<Scalars['Float']>,
};

export type SayMyName = {
   __typename?: 'SayMyName',
  /** The id of the source */
  appName: Scalars['String'],
};

export type SerializedFilterQueryInput = {
  filterQuery?: Maybe<SerializedKueryQueryInput>,
};

export type SerializedFilterQueryResult = {
   __typename?: 'SerializedFilterQueryResult',
  filterQuery?: Maybe<SerializedKueryQueryResult>,
};

export type SerializedKueryQueryInput = {
  kuery?: Maybe<KueryFilterQueryInput>,
  serializedQuery?: Maybe<Scalars['String']>,
};

export type SerializedKueryQueryResult = {
   __typename?: 'SerializedKueryQueryResult',
  kuery?: Maybe<KueryFilterQueryResult>,
  serializedQuery?: Maybe<Scalars['String']>,
};

export type SortField = {
  sortFieldId: Scalars['String'],
  direction: Direction,
};

export enum SortFieldNote {
  updatedBy = 'updatedBy',
  updated = 'updated'
}

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created'
}

export type SortNote = {
  sortField: SortFieldNote,
  sortOrder: Direction,
};

export type SortTimeline = {
  sortField: SortFieldTimeline,
  sortOrder: Direction,
};

export type SortTimelineInput = {
  columnId?: Maybe<Scalars['String']>,
  sortDirection?: Maybe<Scalars['String']>,
};

export type SortTimelineResult = {
   __typename?: 'SortTimelineResult',
  columnId?: Maybe<Scalars['String']>,
  sortDirection?: Maybe<Scalars['String']>,
};

export type Source = {
   __typename?: 'Source',
  /** The id of the source */
  id: Scalars['ID'],
  /** The raw configuration of the source */
  configuration: SourceConfiguration,
  /** The status of the source */
  status: SourceStatus,
  AlertsHistogram: AlertsOverTimeData,
  AnomaliesOverTime: AnomaliesOverTimeData,
  /** Gets Authentication success and failures based on a timerange */
  Authentications: AuthenticationsData,
  AuthenticationsOverTime: AuthenticationsOverTimeData,
  Timeline: TimelineData,
  TimelineDetails: TimelineDetailsData,
  LastEventTime: LastEventTimeData,
  EventsOverTime: EventsOverTimeData,
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData,
  HostOverview: HostItem,
  HostFirstLastSeen: FirstLastSeenHost,
  IpOverview?: Maybe<IpOverviewData>,
  Users: UsersData,
  KpiNetwork?: Maybe<KpiNetworkData>,
  KpiHosts: KpiHostsData,
  KpiHostDetails: KpiHostDetailsData,
  NetworkTopCountries: NetworkTopCountriesData,
  NetworkTopNFlow: NetworkTopNFlowData,
  NetworkDns: NetworkDnsData,
  NetworkHttp: NetworkHttpData,
  OverviewNetwork?: Maybe<OverviewNetworkData>,
  OverviewHost?: Maybe<OverviewHostData>,
  Tls: TlsData,
  /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
  UncommonProcesses: UncommonProcessesData,
  /** Just a simple example to get the app name */
  whoAmI?: Maybe<SayMyName>,
};


export type SourceAlertsHistogramArgs = {
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  timerange: TimerangeInput
};


export type SourceAnomaliesOverTimeArgs = {
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceAuthenticationsArgs = {
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceAuthenticationsOverTimeArgs = {
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceTimelineArgs = {
  pagination: PaginationInput,
  sortField: SortField,
  fieldRequested: Array<Scalars['String']>,
  timerange?: Maybe<TimerangeInput>,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceTimelineDetailsArgs = {
  eventId: Scalars['String'],
  indexName: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
};


export type SourceLastEventTimeArgs = {
  id?: Maybe<Scalars['String']>,
  indexKey: LastEventIndexKey,
  details: LastTimeDetails,
  defaultIndex: Array<Scalars['String']>
};


export type SourceEventsOverTimeArgs = {
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceHostsArgs = {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  sort: HostsSortField,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceHostOverviewArgs = {
  id?: Maybe<Scalars['String']>,
  hostName: Scalars['String'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceHostFirstLastSeenArgs = {
  id?: Maybe<Scalars['String']>,
  hostName: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
};


export type SourceIpOverviewArgs = {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
};


export type SourceUsersArgs = {
  filterQuery?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  pagination: PaginationInputPaginated,
  sort: UsersSortField,
  flowTarget: FlowTarget,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceKpiNetworkArgs = {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceKpiHostsArgs = {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceKpiHostDetailsArgs = {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceNetworkTopCountriesArgs = {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
  flowTarget: FlowTargetSourceDest,
  pagination: PaginationInputPaginated,
  sort: NetworkTopTablesSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceNetworkTopNFlowArgs = {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
  flowTarget: FlowTargetSourceDest,
  pagination: PaginationInputPaginated,
  sort: NetworkTopTablesSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceNetworkDnsArgs = {
  filterQuery?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  isPtrIncluded: Scalars['Boolean'],
  pagination: PaginationInputPaginated,
  sort: NetworkDnsSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceNetworkHttpArgs = {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
  pagination: PaginationInputPaginated,
  sort: NetworkHttpSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceOverviewNetworkArgs = {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceOverviewHostArgs = {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceTlsArgs = {
  filterQuery?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  pagination: PaginationInputPaginated,
  sort: TlsSortField,
  flowTarget: FlowTargetSourceDest,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
};


export type SourceUncommonProcessesArgs = {
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
};

/** A set of configuration options for a security data source */
export type SourceConfiguration = {
   __typename?: 'SourceConfiguration',
  /** The field mapping to use for this source */
  fields: SourceFields,
};

export type SourceEcsFields = {
   __typename?: 'SourceEcsFields',
  bytes?: Maybe<Scalars['ToNumberArray']>,
  ip?: Maybe<Scalars['ToStringArray']>,
  port?: Maybe<Scalars['ToNumberArray']>,
  domain?: Maybe<Scalars['ToStringArray']>,
  geo?: Maybe<GeoEcsFields>,
  packets?: Maybe<Scalars['ToNumberArray']>,
};

/** A mapping of semantic fields to their document counterparts */
export type SourceFields = {
   __typename?: 'SourceFields',
  /** The field to identify a container by */
  container: Scalars['String'],
  /** The fields to identify a host by */
  host: Scalars['String'],
  /** The fields that may contain the log event message. The first field found win. */
  message: Array<Scalars['String']>,
  /** The field to identify a pod by */
  pod: Scalars['String'],
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker: Scalars['String'],
  /** The field to use as a timestamp for metrics and logs */
  timestamp: Scalars['String'],
};

/** The status of an infrastructure data source */
export type SourceStatus = {
   __typename?: 'SourceStatus',
  /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
  indicesExist: Scalars['Boolean'],
  /** The list of fields defined in the index mappings */
  indexFields: Array<IndexField>,
};


/** The status of an infrastructure data source */
export type SourceStatusIndicesExistArgs = {
  defaultIndex: Array<Scalars['String']>
};


/** The status of an infrastructure data source */
export type SourceStatusIndexFieldsArgs = {
  defaultIndex: Array<Scalars['String']>
};

export type SshEcsFields = {
   __typename?: 'SshEcsFields',
  method?: Maybe<Scalars['ToStringArray']>,
  signature?: Maybe<Scalars['ToStringArray']>,
};

export type Summary = {
   __typename?: 'Summary',
  actor?: Maybe<PrimarySecondary>,
  object?: Maybe<PrimarySecondary>,
  how?: Maybe<Scalars['ToStringArray']>,
  message_type?: Maybe<Scalars['ToStringArray']>,
  sequence?: Maybe<Scalars['ToStringArray']>,
};

export type SuricataAlertData = {
   __typename?: 'SuricataAlertData',
  signature?: Maybe<Scalars['ToStringArray']>,
  signature_id?: Maybe<Scalars['ToNumberArray']>,
};

export type SuricataEcsFields = {
   __typename?: 'SuricataEcsFields',
  eve?: Maybe<SuricataEveData>,
};

export type SuricataEveData = {
   __typename?: 'SuricataEveData',
  alert?: Maybe<SuricataAlertData>,
  flow_id?: Maybe<Scalars['ToNumberArray']>,
  proto?: Maybe<Scalars['ToStringArray']>,
};

export type SystemEcsField = {
   __typename?: 'SystemEcsField',
  audit?: Maybe<AuditEcsFields>,
  auth?: Maybe<AuthEcsFields>,
};

export type Thread = {
   __typename?: 'Thread',
  id?: Maybe<Scalars['ToNumberArray']>,
  start?: Maybe<Scalars['ToStringArray']>,
};

export type TimelineData = {
   __typename?: 'TimelineData',
  edges: Array<TimelineEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfo,
  inspect?: Maybe<Inspect>,
};

export type TimelineDetailsData = {
   __typename?: 'TimelineDetailsData',
  data?: Maybe<Array<DetailItem>>,
  inspect?: Maybe<Inspect>,
};

export type TimelineEdges = {
   __typename?: 'TimelineEdges',
  node: TimelineItem,
  cursor: CursorType,
};

export type TimelineInput = {
  columns?: Maybe<Array<ColumnHeaderInput>>,
  dataProviders?: Maybe<Array<DataProviderInput>>,
  description?: Maybe<Scalars['String']>,
  filters?: Maybe<Array<FilterTimelineInput>>,
  kqlMode?: Maybe<Scalars['String']>,
  kqlQuery?: Maybe<SerializedFilterQueryInput>,
  title?: Maybe<Scalars['String']>,
  dateRange?: Maybe<DateRangePickerInput>,
  savedQueryId?: Maybe<Scalars['String']>,
  sort?: Maybe<SortTimelineInput>,
};

export type TimelineItem = {
   __typename?: 'TimelineItem',
  _id: Scalars['String'],
  _index?: Maybe<Scalars['String']>,
  data: Array<TimelineNonEcsData>,
  ecs: Ecs,
};

export type TimelineNonEcsData = {
   __typename?: 'TimelineNonEcsData',
  field: Scalars['String'],
  value?: Maybe<Scalars['ToStringArray']>,
};

export type TimelineResult = {
   __typename?: 'TimelineResult',
  columns?: Maybe<Array<ColumnHeaderResult>>,
  created?: Maybe<Scalars['Float']>,
  createdBy?: Maybe<Scalars['String']>,
  dataProviders?: Maybe<Array<DataProviderResult>>,
  dateRange?: Maybe<DateRangePickerResult>,
  description?: Maybe<Scalars['String']>,
  eventIdToNoteIds?: Maybe<Array<NoteResult>>,
  favorite?: Maybe<Array<FavoriteTimelineResult>>,
  filters?: Maybe<Array<FilterTimelineResult>>,
  kqlMode?: Maybe<Scalars['String']>,
  kqlQuery?: Maybe<SerializedFilterQueryResult>,
  notes?: Maybe<Array<NoteResult>>,
  noteIds?: Maybe<Array<Scalars['String']>>,
  pinnedEventIds?: Maybe<Array<Scalars['String']>>,
  pinnedEventsSaveObject?: Maybe<Array<PinnedEvent>>,
  savedQueryId?: Maybe<Scalars['String']>,
  savedObjectId: Scalars['String'],
  sort?: Maybe<SortTimelineResult>,
  title?: Maybe<Scalars['String']>,
  updated?: Maybe<Scalars['Float']>,
  updatedBy?: Maybe<Scalars['String']>,
  version: Scalars['String'],
};

export type TimerangeInput = {
  /** 
 * The interval string to use for last bucket. The format is '{value}{unit}'. For
   * example '5m' would return the metrics for the last 5 minutes of the timespan.
 */
  interval: Scalars['String'],
  /** The end of the timerange */
  to: Scalars['Float'],
  /** The beginning of the timerange */
  from: Scalars['Float'],
};

export type TlsClientCertificateData = {
   __typename?: 'TlsClientCertificateData',
  fingerprint?: Maybe<FingerprintData>,
};

export type TlsData = {
   __typename?: 'TlsData',
  edges: Array<TlsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type TlsEcsFields = {
   __typename?: 'TlsEcsFields',
  client_certificate?: Maybe<TlsClientCertificateData>,
  fingerprints?: Maybe<TlsFingerprintsData>,
  server_certificate?: Maybe<TlsServerCertificateData>,
};

export type TlsEdges = {
   __typename?: 'TlsEdges',
  node: TlsNode,
  cursor: CursorType,
};

export enum TlsFields {
  _id = '_id'
}

export type TlsFingerprintsData = {
   __typename?: 'TlsFingerprintsData',
  ja3?: Maybe<TlsJa3Data>,
};

export type TlsJa3Data = {
   __typename?: 'TlsJa3Data',
  hash?: Maybe<Scalars['ToStringArray']>,
};

export type TlsNode = {
   __typename?: 'TlsNode',
  _id?: Maybe<Scalars['String']>,
  timestamp?: Maybe<Scalars['Date']>,
  alternativeNames?: Maybe<Array<Scalars['String']>>,
  notAfter?: Maybe<Array<Scalars['String']>>,
  commonNames?: Maybe<Array<Scalars['String']>>,
  ja3?: Maybe<Array<Scalars['String']>>,
  issuerNames?: Maybe<Array<Scalars['String']>>,
};

export type TlsServerCertificateData = {
   __typename?: 'TlsServerCertificateData',
  fingerprint?: Maybe<FingerprintData>,
};

export type TlsSortField = {
  field: TlsFields,
  direction: Direction,
};




export type TopCountriesItemDestination = {
   __typename?: 'TopCountriesItemDestination',
  country?: Maybe<Scalars['String']>,
  destination_ips?: Maybe<Scalars['Float']>,
  flows?: Maybe<Scalars['Float']>,
  location?: Maybe<GeoItem>,
  source_ips?: Maybe<Scalars['Float']>,
};

export type TopCountriesItemSource = {
   __typename?: 'TopCountriesItemSource',
  country?: Maybe<Scalars['String']>,
  destination_ips?: Maybe<Scalars['Float']>,
  flows?: Maybe<Scalars['Float']>,
  location?: Maybe<GeoItem>,
  source_ips?: Maybe<Scalars['Float']>,
};

export type TopNetworkTablesEcsField = {
   __typename?: 'TopNetworkTablesEcsField',
  bytes_in?: Maybe<Scalars['Float']>,
  bytes_out?: Maybe<Scalars['Float']>,
};

export type TopNFlowItemDestination = {
   __typename?: 'TopNFlowItemDestination',
  autonomous_system?: Maybe<AutonomousSystemItem>,
  domain?: Maybe<Array<Scalars['String']>>,
  ip?: Maybe<Scalars['String']>,
  location?: Maybe<GeoItem>,
  flows?: Maybe<Scalars['Float']>,
  source_ips?: Maybe<Scalars['Float']>,
};

export type TopNFlowItemSource = {
   __typename?: 'TopNFlowItemSource',
  autonomous_system?: Maybe<AutonomousSystemItem>,
  domain?: Maybe<Array<Scalars['String']>>,
  ip?: Maybe<Scalars['String']>,
  location?: Maybe<GeoItem>,
  flows?: Maybe<Scalars['Float']>,
  destination_ips?: Maybe<Scalars['Float']>,
};


export type UncommonProcessesData = {
   __typename?: 'UncommonProcessesData',
  edges: Array<UncommonProcessesEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type UncommonProcessesEdges = {
   __typename?: 'UncommonProcessesEdges',
  node: UncommonProcessItem,
  cursor: CursorType,
};

export type UncommonProcessItem = {
   __typename?: 'UncommonProcessItem',
  _id: Scalars['String'],
  instances: Scalars['Float'],
  process: ProcessEcsFields,
  hosts: Array<HostEcsFields>,
  user?: Maybe<UserEcsFields>,
};

export type UrlEcsFields = {
   __typename?: 'UrlEcsFields',
  domain?: Maybe<Scalars['ToStringArray']>,
  original?: Maybe<Scalars['ToStringArray']>,
  username?: Maybe<Scalars['ToStringArray']>,
  password?: Maybe<Scalars['ToStringArray']>,
};

export type UserEcsFields = {
   __typename?: 'UserEcsFields',
  domain?: Maybe<Scalars['ToStringArray']>,
  id?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  full_name?: Maybe<Scalars['ToStringArray']>,
  email?: Maybe<Scalars['ToStringArray']>,
  hash?: Maybe<Scalars['ToStringArray']>,
  group?: Maybe<Scalars['ToStringArray']>,
};

export type UsersData = {
   __typename?: 'UsersData',
  edges: Array<UsersEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type UsersEdges = {
   __typename?: 'UsersEdges',
  node: UsersNode,
  cursor: CursorType,
};

export enum UsersFields {
  name = 'name',
  count = 'count'
}

export type UsersItem = {
   __typename?: 'UsersItem',
  name?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['ToStringArray']>,
  groupId?: Maybe<Scalars['ToStringArray']>,
  groupName?: Maybe<Scalars['ToStringArray']>,
  count?: Maybe<Scalars['Float']>,
};

export type UsersNode = {
   __typename?: 'UsersNode',
  _id?: Maybe<Scalars['String']>,
  timestamp?: Maybe<Scalars['Date']>,
  user?: Maybe<UsersItem>,
};

export type UsersSortField = {
  field: UsersFields,
  direction: Direction,
};

export type WinlogEcsFields = {
   __typename?: 'WinlogEcsFields',
  event_id?: Maybe<Scalars['ToNumberArray']>,
};

export type ZeekConnectionData = {
   __typename?: 'ZeekConnectionData',
  local_resp?: Maybe<Scalars['ToBooleanArray']>,
  local_orig?: Maybe<Scalars['ToBooleanArray']>,
  missed_bytes?: Maybe<Scalars['ToNumberArray']>,
  state?: Maybe<Scalars['ToStringArray']>,
  history?: Maybe<Scalars['ToStringArray']>,
};

export type ZeekDnsData = {
   __typename?: 'ZeekDnsData',
  AA?: Maybe<Scalars['ToBooleanArray']>,
  qclass_name?: Maybe<Scalars['ToStringArray']>,
  RD?: Maybe<Scalars['ToBooleanArray']>,
  qtype_name?: Maybe<Scalars['ToStringArray']>,
  rejected?: Maybe<Scalars['ToBooleanArray']>,
  qtype?: Maybe<Scalars['ToStringArray']>,
  query?: Maybe<Scalars['ToStringArray']>,
  trans_id?: Maybe<Scalars['ToNumberArray']>,
  qclass?: Maybe<Scalars['ToStringArray']>,
  RA?: Maybe<Scalars['ToBooleanArray']>,
  TC?: Maybe<Scalars['ToBooleanArray']>,
};

export type ZeekEcsFields = {
   __typename?: 'ZeekEcsFields',
  session_id?: Maybe<Scalars['ToStringArray']>,
  connection?: Maybe<ZeekConnectionData>,
  notice?: Maybe<ZeekNoticeData>,
  dns?: Maybe<ZeekDnsData>,
  http?: Maybe<ZeekHttpData>,
  files?: Maybe<ZeekFileData>,
  ssl?: Maybe<ZeekSslData>,
};

export type ZeekFileData = {
   __typename?: 'ZeekFileData',
  session_ids?: Maybe<Scalars['ToStringArray']>,
  timedout?: Maybe<Scalars['ToBooleanArray']>,
  local_orig?: Maybe<Scalars['ToBooleanArray']>,
  tx_host?: Maybe<Scalars['ToStringArray']>,
  source?: Maybe<Scalars['ToStringArray']>,
  is_orig?: Maybe<Scalars['ToBooleanArray']>,
  overflow_bytes?: Maybe<Scalars['ToNumberArray']>,
  sha1?: Maybe<Scalars['ToStringArray']>,
  duration?: Maybe<Scalars['ToNumberArray']>,
  depth?: Maybe<Scalars['ToNumberArray']>,
  analyzers?: Maybe<Scalars['ToStringArray']>,
  mime_type?: Maybe<Scalars['ToStringArray']>,
  rx_host?: Maybe<Scalars['ToStringArray']>,
  total_bytes?: Maybe<Scalars['ToNumberArray']>,
  fuid?: Maybe<Scalars['ToStringArray']>,
  seen_bytes?: Maybe<Scalars['ToNumberArray']>,
  missing_bytes?: Maybe<Scalars['ToNumberArray']>,
  md5?: Maybe<Scalars['ToStringArray']>,
};

export type ZeekHttpData = {
   __typename?: 'ZeekHttpData',
  resp_mime_types?: Maybe<Scalars['ToStringArray']>,
  trans_depth?: Maybe<Scalars['ToStringArray']>,
  status_msg?: Maybe<Scalars['ToStringArray']>,
  resp_fuids?: Maybe<Scalars['ToStringArray']>,
  tags?: Maybe<Scalars['ToStringArray']>,
};

export type ZeekNoticeData = {
   __typename?: 'ZeekNoticeData',
  suppress_for?: Maybe<Scalars['ToNumberArray']>,
  msg?: Maybe<Scalars['ToStringArray']>,
  note?: Maybe<Scalars['ToStringArray']>,
  sub?: Maybe<Scalars['ToStringArray']>,
  dst?: Maybe<Scalars['ToStringArray']>,
  dropped?: Maybe<Scalars['ToBooleanArray']>,
  peer_descr?: Maybe<Scalars['ToStringArray']>,
};

export type ZeekSslData = {
   __typename?: 'ZeekSslData',
  cipher?: Maybe<Scalars['ToStringArray']>,
  established?: Maybe<Scalars['ToBooleanArray']>,
  resumed?: Maybe<Scalars['ToBooleanArray']>,
  version?: Maybe<Scalars['ToStringArray']>,
};

export type GetAlertsOverTimeQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetAlertsOverTimeQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, AlertsHistogram: { __typename?: 'AlertsOverTimeData', totalCount: number, alertsOverTimeByModule: Array<{ __typename?: 'MatrixOverTimeHistogramData', x: number, y: number, g: string }>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetAnomaliesOverTimeQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetAnomaliesOverTimeQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, AnomaliesOverTime: { __typename?: 'AnomaliesOverTimeData', totalCount: number, anomaliesOverTime: Array<{ __typename?: 'MatrixOverTimeHistogramData', x: number, y: number, g: string }>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetAuthenticationsOverTimeQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetAuthenticationsOverTimeQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, AuthenticationsOverTime: { __typename?: 'AuthenticationsOverTimeData', totalCount: number, authenticationsOverTime: Array<{ __typename?: 'MatrixOverTimeHistogramData', x: number, y: number, g: string }>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetAuthenticationsQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetAuthenticationsQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, Authentications: { __typename?: 'AuthenticationsData', totalCount: number, edges: Array<{ __typename?: 'AuthenticationsEdges', node: { __typename?: 'AuthenticationItem', _id: string, failures: number, successes: number, user: { __typename?: 'UserEcsFields', name: Maybe<string[]> }, lastSuccess: Maybe<{ __typename?: 'LastSourceHost', timestamp: Maybe<string>, source: Maybe<{ __typename?: 'SourceEcsFields', ip: Maybe<string[]> }>, host: Maybe<{ __typename?: 'HostEcsFields', id: Maybe<string[]>, name: Maybe<string[]> }> }>, lastFailure: Maybe<{ __typename?: 'LastSourceHost', timestamp: Maybe<string>, source: Maybe<{ __typename?: 'SourceEcsFields', ip: Maybe<string[]> }>, host: Maybe<{ __typename?: 'HostEcsFields', id: Maybe<string[]>, name: Maybe<string[]> }> }> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetEventsOverTimeQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetEventsOverTimeQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, EventsOverTime: { __typename?: 'EventsOverTimeData', totalCount: number, eventsOverTime: Array<{ __typename?: 'MatrixOverTimeHistogramData', x: number, y: number, g: string }>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetLastEventTimeQueryQueryVariables = {
  sourceId: Scalars['ID'],
  indexKey: LastEventIndexKey,
  details: LastTimeDetails,
  defaultIndex: Array<Scalars['String']>
};


export type GetLastEventTimeQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, LastEventTime: { __typename?: 'LastEventTimeData', lastSeen: Maybe<string> } } };

export type GetHostFirstLastSeenQueryQueryVariables = {
  sourceId: Scalars['ID'],
  hostName: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
};


export type GetHostFirstLastSeenQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, HostFirstLastSeen: { __typename?: 'FirstLastSeenHost', firstSeen: Maybe<string>, lastSeen: Maybe<string> } } };

export type GetHostsTableQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  sort: HostsSortField,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetHostsTableQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, Hosts: { __typename?: 'HostsData', totalCount: number, edges: Array<{ __typename?: 'HostsEdges', node: { __typename?: 'HostItem', _id: Maybe<string>, lastSeen: Maybe<string>, host: Maybe<{ __typename?: 'HostEcsFields', id: Maybe<string[]>, name: Maybe<string[]>, os: Maybe<{ __typename?: 'OsEcsFields', name: Maybe<string[]>, version: Maybe<string[]> }> }> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetHostOverviewQueryQueryVariables = {
  sourceId: Scalars['ID'],
  hostName: Scalars['String'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetHostOverviewQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, HostOverview: { __typename?: 'HostItem', _id: Maybe<string>, host: Maybe<{ __typename?: 'HostEcsFields', architecture: Maybe<string[]>, id: Maybe<string[]>, ip: Maybe<string[]>, mac: Maybe<string[]>, name: Maybe<string[]>, type: Maybe<string[]>, os: Maybe<{ __typename?: 'OsEcsFields', family: Maybe<string[]>, name: Maybe<string[]>, platform: Maybe<string[]>, version: Maybe<string[]> }> }>, cloud: Maybe<{ __typename?: 'CloudFields', provider: Maybe<Array<Maybe<string>>>, region: Maybe<Array<Maybe<string>>>, instance: Maybe<{ __typename?: 'CloudInstance', id: Maybe<Array<Maybe<string>>> }>, machine: Maybe<{ __typename?: 'CloudMachine', type: Maybe<Array<Maybe<string>>> }> }>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetIpOverviewQueryQueryVariables = {
  sourceId: Scalars['ID'],
  filterQuery?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetIpOverviewQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, IpOverview: Maybe<{ __typename?: 'IpOverviewData', source: Maybe<{ __typename?: 'Overview', firstSeen: Maybe<string>, lastSeen: Maybe<string>, autonomousSystem: { __typename?: 'AutonomousSystem', number: Maybe<number>, organization: Maybe<{ __typename?: 'AutonomousSystemOrganization', name: Maybe<string> }> }, geo: { __typename?: 'GeoEcsFields', continent_name: Maybe<string[]>, city_name: Maybe<string[]>, country_iso_code: Maybe<string[]>, country_name: Maybe<string[]>, region_iso_code: Maybe<string[]>, region_name: Maybe<string[]>, location: Maybe<{ __typename?: 'Location', lat: Maybe<number[]>, lon: Maybe<number[]> }> } }>, destination: Maybe<{ __typename?: 'Overview', firstSeen: Maybe<string>, lastSeen: Maybe<string>, autonomousSystem: { __typename?: 'AutonomousSystem', number: Maybe<number>, organization: Maybe<{ __typename?: 'AutonomousSystemOrganization', name: Maybe<string> }> }, geo: { __typename?: 'GeoEcsFields', continent_name: Maybe<string[]>, city_name: Maybe<string[]>, country_iso_code: Maybe<string[]>, country_name: Maybe<string[]>, region_iso_code: Maybe<string[]>, region_name: Maybe<string[]>, location: Maybe<{ __typename?: 'Location', lat: Maybe<number[]>, lon: Maybe<number[]> }> } }>, host: { __typename?: 'HostEcsFields', architecture: Maybe<string[]>, id: Maybe<string[]>, ip: Maybe<string[]>, mac: Maybe<string[]>, name: Maybe<string[]>, type: Maybe<string[]>, os: Maybe<{ __typename?: 'OsEcsFields', family: Maybe<string[]>, name: Maybe<string[]>, platform: Maybe<string[]>, version: Maybe<string[]> }> }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> }> } };

export type KpiHostDetailsChartFieldsFragment = { __typename?: 'KpiHostHistogramData', x: Maybe<number>, y: Maybe<number> };

export type GetKpiHostDetailsQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetKpiHostDetailsQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, KpiHostDetails: { __typename?: 'KpiHostDetailsData', authSuccess: Maybe<number>, authFailure: Maybe<number>, uniqueSourceIps: Maybe<number>, uniqueDestinationIps: Maybe<number>, authSuccessHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostDetailsChartFieldsFragment
      )>>, authFailureHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostDetailsChartFieldsFragment
      )>>, uniqueSourceIpsHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostDetailsChartFieldsFragment
      )>>, uniqueDestinationIpsHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostDetailsChartFieldsFragment
      )>>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type KpiHostChartFieldsFragment = { __typename?: 'KpiHostHistogramData', x: Maybe<number>, y: Maybe<number> };

export type GetKpiHostsQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetKpiHostsQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, KpiHosts: { __typename?: 'KpiHostsData', hosts: Maybe<number>, authSuccess: Maybe<number>, authFailure: Maybe<number>, uniqueSourceIps: Maybe<number>, uniqueDestinationIps: Maybe<number>, hostsHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostChartFieldsFragment
      )>>, authSuccessHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostChartFieldsFragment
      )>>, authFailureHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostChartFieldsFragment
      )>>, uniqueSourceIpsHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostChartFieldsFragment
      )>>, uniqueDestinationIpsHistogram: Maybe<Array<(
        { __typename?: 'KpiHostHistogramData' }
        & KpiHostChartFieldsFragment
      )>>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type KpiNetworkChartFieldsFragment = { __typename?: 'KpiNetworkHistogramData', x: Maybe<number>, y: Maybe<number> };

export type GetKpiNetworkQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetKpiNetworkQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, KpiNetwork: Maybe<{ __typename?: 'KpiNetworkData', networkEvents: Maybe<number>, uniqueFlowId: Maybe<number>, uniqueSourcePrivateIps: Maybe<number>, uniqueDestinationPrivateIps: Maybe<number>, dnsQueries: Maybe<number>, tlsHandshakes: Maybe<number>, uniqueSourcePrivateIpsHistogram: Maybe<Array<(
        { __typename?: 'KpiNetworkHistogramData' }
        & KpiNetworkChartFieldsFragment
      )>>, uniqueDestinationPrivateIpsHistogram: Maybe<Array<(
        { __typename?: 'KpiNetworkHistogramData' }
        & KpiNetworkChartFieldsFragment
      )>>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> }> } };

export type GetNetworkDnsQueryQueryVariables = {
  sourceId: Scalars['ID'],
  sort: NetworkDnsSortField,
  isPtrIncluded: Scalars['Boolean'],
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetNetworkDnsQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, NetworkDns: { __typename?: 'NetworkDnsData', totalCount: number, edges: Array<{ __typename?: 'NetworkDnsEdges', node: { __typename?: 'NetworkDnsItem', _id: Maybe<string>, dnsBytesIn: Maybe<number>, dnsBytesOut: Maybe<number>, dnsName: Maybe<string>, queryCount: Maybe<number>, uniqueDomains: Maybe<number> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }>, histogram: Maybe<Array<{ __typename?: 'MatrixOverOrdinalHistogramData', x: string, y: number, g: string }>> } } };

export type GetNetworkHttpQueryQueryVariables = {
  sourceId: Scalars['ID'],
  ip?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  pagination: PaginationInputPaginated,
  sort: NetworkHttpSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetNetworkHttpQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, NetworkHttp: { __typename?: 'NetworkHttpData', totalCount: number, edges: Array<{ __typename?: 'NetworkHttpEdges', node: { __typename?: 'NetworkHttpItem', domains: Array<string>, lastHost: Maybe<string>, lastSourceIp: Maybe<string>, methods: Array<string>, path: Maybe<string>, requestCount: Maybe<number>, statuses: Array<string> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetNetworkTopCountriesQueryQueryVariables = {
  sourceId: Scalars['ID'],
  ip?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  pagination: PaginationInputPaginated,
  sort: NetworkTopTablesSortField,
  flowTarget: FlowTargetSourceDest,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetNetworkTopCountriesQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, NetworkTopCountries: { __typename?: 'NetworkTopCountriesData', totalCount: number, edges: Array<{ __typename?: 'NetworkTopCountriesEdges', node: { __typename?: 'NetworkTopCountriesItem', source: Maybe<{ __typename?: 'TopCountriesItemSource', country: Maybe<string>, destination_ips: Maybe<number>, flows: Maybe<number>, source_ips: Maybe<number> }>, destination: Maybe<{ __typename?: 'TopCountriesItemDestination', country: Maybe<string>, destination_ips: Maybe<number>, flows: Maybe<number>, source_ips: Maybe<number> }>, network: Maybe<{ __typename?: 'TopNetworkTablesEcsField', bytes_in: Maybe<number>, bytes_out: Maybe<number> }> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetNetworkTopNFlowQueryQueryVariables = {
  sourceId: Scalars['ID'],
  ip?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  pagination: PaginationInputPaginated,
  sort: NetworkTopTablesSortField,
  flowTarget: FlowTargetSourceDest,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetNetworkTopNFlowQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, NetworkTopNFlow: { __typename?: 'NetworkTopNFlowData', totalCount: number, edges: Array<{ __typename?: 'NetworkTopNFlowEdges', node: { __typename?: 'NetworkTopNFlowItem', source: Maybe<{ __typename?: 'TopNFlowItemSource', domain: Maybe<Array<string>>, ip: Maybe<string>, flows: Maybe<number>, destination_ips: Maybe<number>, autonomous_system: Maybe<{ __typename?: 'AutonomousSystemItem', name: Maybe<string>, number: Maybe<number> }>, location: Maybe<{ __typename?: 'GeoItem', flowTarget: Maybe<FlowTargetSourceDest>, geo: Maybe<{ __typename?: 'GeoEcsFields', continent_name: Maybe<string[]>, country_name: Maybe<string[]>, country_iso_code: Maybe<string[]>, city_name: Maybe<string[]>, region_iso_code: Maybe<string[]>, region_name: Maybe<string[]> }> }> }>, destination: Maybe<{ __typename?: 'TopNFlowItemDestination', domain: Maybe<Array<string>>, ip: Maybe<string>, flows: Maybe<number>, source_ips: Maybe<number>, autonomous_system: Maybe<{ __typename?: 'AutonomousSystemItem', name: Maybe<string>, number: Maybe<number> }>, location: Maybe<{ __typename?: 'GeoItem', flowTarget: Maybe<FlowTargetSourceDest>, geo: Maybe<{ __typename?: 'GeoEcsFields', continent_name: Maybe<string[]>, country_name: Maybe<string[]>, country_iso_code: Maybe<string[]>, city_name: Maybe<string[]>, region_iso_code: Maybe<string[]>, region_name: Maybe<string[]> }> }> }>, network: Maybe<{ __typename?: 'TopNetworkTablesEcsField', bytes_in: Maybe<number>, bytes_out: Maybe<number> }> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetOverviewHostQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetOverviewHostQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, OverviewHost: Maybe<{ __typename?: 'OverviewHostData', auditbeatAuditd: Maybe<number>, auditbeatFIM: Maybe<number>, auditbeatLogin: Maybe<number>, auditbeatPackage: Maybe<number>, auditbeatProcess: Maybe<number>, auditbeatUser: Maybe<number>, endgameDns: Maybe<number>, endgameFile: Maybe<number>, endgameImageLoad: Maybe<number>, endgameNetwork: Maybe<number>, endgameProcess: Maybe<number>, endgameRegistry: Maybe<number>, endgameSecurity: Maybe<number>, filebeatSystemModule: Maybe<number>, winlogbeat: Maybe<number>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> }> } };

export type GetOverviewNetworkQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetOverviewNetworkQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, OverviewNetwork: Maybe<{ __typename?: 'OverviewNetworkData', auditbeatSocket: Maybe<number>, filebeatCisco: Maybe<number>, filebeatNetflow: Maybe<number>, filebeatPanw: Maybe<number>, filebeatSuricata: Maybe<number>, filebeatZeek: Maybe<number>, packetbeatDNS: Maybe<number>, packetbeatFlow: Maybe<number>, packetbeatTLS: Maybe<number>, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> }> } };

export type SourceQueryQueryVariables = {
  sourceId?: Maybe<Scalars['ID']>,
  defaultIndex: Array<Scalars['String']>
};


export type SourceQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, status: { __typename?: 'SourceStatus', indicesExist: boolean, indexFields: Array<{ __typename?: 'IndexField', category: string, description: Maybe<string>, example: Maybe<string>, indexes: Array<Maybe<string>>, name: string, searchable: boolean, type: string, aggregatable: boolean, format: Maybe<string> }> } } };

export type GetAllTimelineQueryVariables = {
  pageInfo: PageInfoTimeline,
  search?: Maybe<Scalars['String']>,
  sort?: Maybe<SortTimeline>,
  onlyUserFavorite?: Maybe<Scalars['Boolean']>
};


export type GetAllTimelineQuery = { __typename?: 'Query', getAllTimeline: { __typename?: 'ResponseTimelines', totalCount: Maybe<number>, timeline: Array<Maybe<{ __typename?: 'TimelineResult', savedObjectId: string, description: Maybe<string>, noteIds: Maybe<Array<string>>, pinnedEventIds: Maybe<Array<string>>, title: Maybe<string>, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: string, favorite: Maybe<Array<{ __typename?: 'FavoriteTimelineResult', fullName: Maybe<string>, userName: Maybe<string>, favoriteDate: Maybe<number> }>>, eventIdToNoteIds: Maybe<Array<{ __typename?: 'NoteResult', eventId: Maybe<string>, note: Maybe<string>, timelineId: Maybe<string>, noteId: string, created: Maybe<number>, createdBy: Maybe<string>, timelineVersion: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> }>>, notes: Maybe<Array<{ __typename?: 'NoteResult', eventId: Maybe<string>, note: Maybe<string>, timelineId: Maybe<string>, timelineVersion: Maybe<string>, noteId: string, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> }>> }>> } };

export type DeleteTimelineMutationMutationVariables = {
  id: Array<Scalars['ID']>
};


export type DeleteTimelineMutationMutation = { __typename?: 'Mutation', deleteTimeline: boolean };

export type GetTimelineDetailsQueryQueryVariables = {
  sourceId: Scalars['ID'],
  eventId: Scalars['String'],
  indexName: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
};


export type GetTimelineDetailsQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, TimelineDetails: { __typename?: 'TimelineDetailsData', data: Maybe<Array<{ __typename?: 'DetailItem', field: string, values: Maybe<string[]>, originalValue: Maybe<any> }>> } } };

export type PersistTimelineFavoriteMutationMutationVariables = {
  timelineId?: Maybe<Scalars['ID']>
};


export type PersistTimelineFavoriteMutationMutation = { __typename?: 'Mutation', persistFavorite: { __typename?: 'ResponseFavoriteTimeline', savedObjectId: string, version: string, favorite: Maybe<Array<{ __typename?: 'FavoriteTimelineResult', fullName: Maybe<string>, userName: Maybe<string>, favoriteDate: Maybe<number> }>> } };

export type GetTimelineQueryQueryVariables = {
  sourceId: Scalars['ID'],
  fieldRequested: Array<Scalars['String']>,
  pagination: PaginationInput,
  sortField: SortField,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetTimelineQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, Timeline: { __typename?: 'TimelineData', totalCount: number, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: Maybe<boolean>, endCursor: Maybe<{ __typename?: 'CursorType', value: Maybe<string>, tiebreaker: Maybe<string> }> }, edges: Array<{ __typename?: 'TimelineEdges', node: { __typename?: 'TimelineItem', _id: string, _index: Maybe<string>, data: Array<{ __typename?: 'TimelineNonEcsData', field: string, value: Maybe<string[]> }>, ecs: { __typename?: 'ECS', _id: string, _index: Maybe<string>, timestamp: Maybe<string>, message: Maybe<string[]>, system: Maybe<{ __typename?: 'SystemEcsField', auth: Maybe<{ __typename?: 'AuthEcsFields', ssh: Maybe<{ __typename?: 'SshEcsFields', signature: Maybe<string[]>, method: Maybe<string[]> }> }>, audit: Maybe<{ __typename?: 'AuditEcsFields', package: Maybe<{ __typename?: 'PackageEcsFields', arch: Maybe<string[]>, entity_id: Maybe<string[]>, name: Maybe<string[]>, size: Maybe<number[]>, summary: Maybe<string[]>, version: Maybe<string[]> }> }> }>, event: Maybe<{ __typename?: 'EventEcsFields', action: Maybe<string[]>, category: Maybe<string[]>, code: Maybe<string[]>, created: Maybe<string[]>, dataset: Maybe<string[]>, duration: Maybe<number[]>, end: Maybe<string[]>, hash: Maybe<string[]>, id: Maybe<string[]>, kind: Maybe<string[]>, module: Maybe<string[]>, original: Maybe<string[]>, outcome: Maybe<string[]>, risk_score: Maybe<number[]>, risk_score_norm: Maybe<number[]>, severity: Maybe<number[]>, start: Maybe<string[]>, timezone: Maybe<string[]>, type: Maybe<string[]> }>, auditd: Maybe<{ __typename?: 'AuditdEcsFields', result: Maybe<string[]>, session: Maybe<string[]>, data: Maybe<{ __typename?: 'AuditdData', acct: Maybe<string[]>, terminal: Maybe<string[]>, op: Maybe<string[]> }>, summary: Maybe<{ __typename?: 'Summary', how: Maybe<string[]>, message_type: Maybe<string[]>, sequence: Maybe<string[]>, actor: Maybe<{ __typename?: 'PrimarySecondary', primary: Maybe<string[]>, secondary: Maybe<string[]> }>, object: Maybe<{ __typename?: 'PrimarySecondary', primary: Maybe<string[]>, secondary: Maybe<string[]>, type: Maybe<string[]> }> }> }>, file: Maybe<{ __typename?: 'FileFields', name: Maybe<string[]>, path: Maybe<string[]>, target_path: Maybe<string[]>, extension: Maybe<string[]>, type: Maybe<string[]>, device: Maybe<string[]>, inode: Maybe<string[]>, uid: Maybe<string[]>, owner: Maybe<string[]>, gid: Maybe<string[]>, group: Maybe<string[]>, mode: Maybe<string[]>, size: Maybe<number[]>, mtime: Maybe<string[]>, ctime: Maybe<string[]> }>, host: Maybe<{ __typename?: 'HostEcsFields', id: Maybe<string[]>, name: Maybe<string[]>, ip: Maybe<string[]> }>, source: Maybe<{ __typename?: 'SourceEcsFields', bytes: Maybe<number[]>, ip: Maybe<string[]>, packets: Maybe<number[]>, port: Maybe<number[]>, geo: Maybe<{ __typename?: 'GeoEcsFields', continent_name: Maybe<string[]>, country_name: Maybe<string[]>, country_iso_code: Maybe<string[]>, city_name: Maybe<string[]>, region_iso_code: Maybe<string[]>, region_name: Maybe<string[]> }> }>, destination: Maybe<{ __typename?: 'DestinationEcsFields', bytes: Maybe<number[]>, ip: Maybe<string[]>, packets: Maybe<number[]>, port: Maybe<number[]>, geo: Maybe<{ __typename?: 'GeoEcsFields', continent_name: Maybe<string[]>, country_name: Maybe<string[]>, country_iso_code: Maybe<string[]>, city_name: Maybe<string[]>, region_iso_code: Maybe<string[]>, region_name: Maybe<string[]> }> }>, dns: Maybe<{ __typename?: 'DnsEcsFields', resolved_ip: Maybe<string[]>, response_code: Maybe<string[]>, question: Maybe<{ __typename?: 'DnsQuestionData', name: Maybe<string[]>, type: Maybe<string[]> }> }>, endgame: Maybe<{ __typename?: 'EndgameEcsFields', exit_code: Maybe<number[]>, file_name: Maybe<string[]>, file_path: Maybe<string[]>, logon_type: Maybe<number[]>, parent_process_name: Maybe<string[]>, pid: Maybe<number[]>, process_name: Maybe<string[]>, subject_domain_name: Maybe<string[]>, subject_logon_id: Maybe<string[]>, subject_user_name: Maybe<string[]>, target_domain_name: Maybe<string[]>, target_logon_id: Maybe<string[]>, target_user_name: Maybe<string[]> }>, geo: Maybe<{ __typename?: 'GeoEcsFields', region_name: Maybe<string[]>, country_iso_code: Maybe<string[]> }>, suricata: Maybe<{ __typename?: 'SuricataEcsFields', eve: Maybe<{ __typename?: 'SuricataEveData', proto: Maybe<string[]>, flow_id: Maybe<number[]>, alert: Maybe<{ __typename?: 'SuricataAlertData', signature: Maybe<string[]>, signature_id: Maybe<number[]> }> }> }>, network: Maybe<{ __typename?: 'NetworkEcsField', bytes: Maybe<number[]>, community_id: Maybe<string[]>, direction: Maybe<string[]>, packets: Maybe<number[]>, protocol: Maybe<string[]>, transport: Maybe<string[]> }>, http: Maybe<{ __typename?: 'HttpEcsFields', version: Maybe<string[]>, request: Maybe<{ __typename?: 'HttpRequestData', method: Maybe<string[]>, referrer: Maybe<string[]>, body: Maybe<{ __typename?: 'HttpBodyData', bytes: Maybe<number[]>, content: Maybe<string[]> }> }>, response: Maybe<{ __typename?: 'HttpResponseData', status_code: Maybe<number[]>, body: Maybe<{ __typename?: 'HttpBodyData', bytes: Maybe<number[]>, content: Maybe<string[]> }> }> }>, tls: Maybe<{ __typename?: 'TlsEcsFields', client_certificate: Maybe<{ __typename?: 'TlsClientCertificateData', fingerprint: Maybe<{ __typename?: 'FingerprintData', sha1: Maybe<string[]> }> }>, fingerprints: Maybe<{ __typename?: 'TlsFingerprintsData', ja3: Maybe<{ __typename?: 'TlsJa3Data', hash: Maybe<string[]> }> }>, server_certificate: Maybe<{ __typename?: 'TlsServerCertificateData', fingerprint: Maybe<{ __typename?: 'FingerprintData', sha1: Maybe<string[]> }> }> }>, url: Maybe<{ __typename?: 'UrlEcsFields', original: Maybe<string[]>, domain: Maybe<string[]>, username: Maybe<string[]>, password: Maybe<string[]> }>, user: Maybe<{ __typename?: 'UserEcsFields', domain: Maybe<string[]>, name: Maybe<string[]> }>, winlog: Maybe<{ __typename?: 'WinlogEcsFields', event_id: Maybe<number[]> }>, process: Maybe<{ __typename?: 'ProcessEcsFields', pid: Maybe<number[]>, name: Maybe<string[]>, ppid: Maybe<number[]>, args: Maybe<string[]>, executable: Maybe<string[]>, title: Maybe<string[]>, working_directory: Maybe<string[]>, hash: Maybe<{ __typename?: 'ProcessHashData', md5: Maybe<string[]>, sha1: Maybe<string[]>, sha256: Maybe<string[]> }> }>, zeek: Maybe<{ __typename?: 'ZeekEcsFields', session_id: Maybe<string[]>, connection: Maybe<{ __typename?: 'ZeekConnectionData', local_resp: Maybe<boolean[]>, local_orig: Maybe<boolean[]>, missed_bytes: Maybe<number[]>, state: Maybe<string[]>, history: Maybe<string[]> }>, notice: Maybe<{ __typename?: 'ZeekNoticeData', suppress_for: Maybe<number[]>, msg: Maybe<string[]>, note: Maybe<string[]>, sub: Maybe<string[]>, dst: Maybe<string[]>, dropped: Maybe<boolean[]>, peer_descr: Maybe<string[]> }>, dns: Maybe<{ __typename?: 'ZeekDnsData', AA: Maybe<boolean[]>, qclass_name: Maybe<string[]>, RD: Maybe<boolean[]>, qtype_name: Maybe<string[]>, rejected: Maybe<boolean[]>, qtype: Maybe<string[]>, query: Maybe<string[]>, trans_id: Maybe<number[]>, qclass: Maybe<string[]>, RA: Maybe<boolean[]>, TC: Maybe<boolean[]> }>, http: Maybe<{ __typename?: 'ZeekHttpData', resp_mime_types: Maybe<string[]>, trans_depth: Maybe<string[]>, status_msg: Maybe<string[]>, resp_fuids: Maybe<string[]>, tags: Maybe<string[]> }>, files: Maybe<{ __typename?: 'ZeekFileData', session_ids: Maybe<string[]>, timedout: Maybe<boolean[]>, local_orig: Maybe<boolean[]>, tx_host: Maybe<string[]>, source: Maybe<string[]>, is_orig: Maybe<boolean[]>, overflow_bytes: Maybe<number[]>, sha1: Maybe<string[]>, duration: Maybe<number[]>, depth: Maybe<number[]>, analyzers: Maybe<string[]>, mime_type: Maybe<string[]>, rx_host: Maybe<string[]>, total_bytes: Maybe<number[]>, fuid: Maybe<string[]>, seen_bytes: Maybe<number[]>, missing_bytes: Maybe<number[]>, md5: Maybe<string[]> }>, ssl: Maybe<{ __typename?: 'ZeekSslData', cipher: Maybe<string[]>, established: Maybe<boolean[]>, resumed: Maybe<boolean[]>, version: Maybe<string[]> }> }> } } }> } } };

export type PersistTimelineNoteMutationMutationVariables = {
  noteId?: Maybe<Scalars['ID']>,
  version?: Maybe<Scalars['String']>,
  note: NoteInput
};


export type PersistTimelineNoteMutationMutation = { __typename?: 'Mutation', persistNote: { __typename?: 'ResponseNote', code: Maybe<number>, message: Maybe<string>, note: { __typename?: 'NoteResult', eventId: Maybe<string>, note: Maybe<string>, timelineId: Maybe<string>, timelineVersion: Maybe<string>, noteId: string, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> } } };

export type GetOneTimelineQueryVariables = {
  id: Scalars['ID']
};


export type GetOneTimelineQuery = { __typename?: 'Query', getOneTimeline: { __typename?: 'TimelineResult', savedObjectId: string, description: Maybe<string>, kqlMode: Maybe<string>, noteIds: Maybe<Array<string>>, pinnedEventIds: Maybe<Array<string>>, title: Maybe<string>, savedQueryId: Maybe<string>, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: string, columns: Maybe<Array<{ __typename?: 'ColumnHeaderResult', aggregatable: Maybe<boolean>, category: Maybe<string>, columnHeaderType: Maybe<string>, description: Maybe<string>, example: Maybe<string>, indexes: Maybe<Array<string>>, id: Maybe<string>, name: Maybe<string>, searchable: Maybe<boolean>, type: Maybe<string> }>>, dataProviders: Maybe<Array<{ __typename?: 'DataProviderResult', id: Maybe<string>, name: Maybe<string>, enabled: Maybe<boolean>, excluded: Maybe<boolean>, kqlQuery: Maybe<string>, queryMatch: Maybe<{ __typename?: 'QueryMatchResult', field: Maybe<string>, displayField: Maybe<string>, value: Maybe<string>, displayValue: Maybe<string>, operator: Maybe<string> }>, and: Maybe<Array<{ __typename?: 'DataProviderResult', id: Maybe<string>, name: Maybe<string>, enabled: Maybe<boolean>, excluded: Maybe<boolean>, kqlQuery: Maybe<string>, queryMatch: Maybe<{ __typename?: 'QueryMatchResult', field: Maybe<string>, displayField: Maybe<string>, value: Maybe<string>, displayValue: Maybe<string>, operator: Maybe<string> }> }>> }>>, dateRange: Maybe<{ __typename?: 'DateRangePickerResult', start: Maybe<number>, end: Maybe<number> }>, eventIdToNoteIds: Maybe<Array<{ __typename?: 'NoteResult', eventId: Maybe<string>, note: Maybe<string>, timelineId: Maybe<string>, noteId: string, created: Maybe<number>, createdBy: Maybe<string>, timelineVersion: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> }>>, favorite: Maybe<Array<{ __typename?: 'FavoriteTimelineResult', fullName: Maybe<string>, userName: Maybe<string>, favoriteDate: Maybe<number> }>>, filters: Maybe<Array<{ __typename?: 'FilterTimelineResult', query: Maybe<string>, exists: Maybe<string>, match_all: Maybe<string>, missing: Maybe<string>, range: Maybe<string>, script: Maybe<string>, meta: Maybe<{ __typename?: 'FilterMetaTimelineResult', alias: Maybe<string>, controlledBy: Maybe<string>, disabled: Maybe<boolean>, field: Maybe<string>, formattedValue: Maybe<string>, index: Maybe<string>, key: Maybe<string>, negate: Maybe<boolean>, params: Maybe<string>, type: Maybe<string>, value: Maybe<string> }> }>>, kqlQuery: Maybe<{ __typename?: 'SerializedFilterQueryResult', filterQuery: Maybe<{ __typename?: 'SerializedKueryQueryResult', serializedQuery: Maybe<string>, kuery: Maybe<{ __typename?: 'KueryFilterQueryResult', kind: Maybe<string>, expression: Maybe<string> }> }> }>, notes: Maybe<Array<{ __typename?: 'NoteResult', eventId: Maybe<string>, note: Maybe<string>, timelineId: Maybe<string>, timelineVersion: Maybe<string>, noteId: string, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> }>>, pinnedEventsSaveObject: Maybe<Array<{ __typename?: 'PinnedEvent', pinnedEventId: string, eventId: Maybe<string>, timelineId: Maybe<string>, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> }>>, sort: Maybe<{ __typename?: 'SortTimelineResult', columnId: Maybe<string>, sortDirection: Maybe<string> }> } };

export type PersistTimelineMutationMutationVariables = {
  timelineId?: Maybe<Scalars['ID']>,
  version?: Maybe<Scalars['String']>,
  timeline: TimelineInput
};


export type PersistTimelineMutationMutation = { __typename?: 'Mutation', persistTimeline: { __typename?: 'ResponseTimeline', code: Maybe<number>, message: Maybe<string>, timeline: { __typename?: 'TimelineResult', savedObjectId: string, version: string, description: Maybe<string>, kqlMode: Maybe<string>, title: Maybe<string>, savedQueryId: Maybe<string>, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, columns: Maybe<Array<{ __typename?: 'ColumnHeaderResult', aggregatable: Maybe<boolean>, category: Maybe<string>, columnHeaderType: Maybe<string>, description: Maybe<string>, example: Maybe<string>, indexes: Maybe<Array<string>>, id: Maybe<string>, name: Maybe<string>, searchable: Maybe<boolean>, type: Maybe<string> }>>, dataProviders: Maybe<Array<{ __typename?: 'DataProviderResult', id: Maybe<string>, name: Maybe<string>, enabled: Maybe<boolean>, excluded: Maybe<boolean>, kqlQuery: Maybe<string>, queryMatch: Maybe<{ __typename?: 'QueryMatchResult', field: Maybe<string>, displayField: Maybe<string>, value: Maybe<string>, displayValue: Maybe<string>, operator: Maybe<string> }>, and: Maybe<Array<{ __typename?: 'DataProviderResult', id: Maybe<string>, name: Maybe<string>, enabled: Maybe<boolean>, excluded: Maybe<boolean>, kqlQuery: Maybe<string>, queryMatch: Maybe<{ __typename?: 'QueryMatchResult', field: Maybe<string>, displayField: Maybe<string>, value: Maybe<string>, displayValue: Maybe<string>, operator: Maybe<string> }> }>> }>>, favorite: Maybe<Array<{ __typename?: 'FavoriteTimelineResult', fullName: Maybe<string>, userName: Maybe<string>, favoriteDate: Maybe<number> }>>, filters: Maybe<Array<{ __typename?: 'FilterTimelineResult', query: Maybe<string>, exists: Maybe<string>, match_all: Maybe<string>, missing: Maybe<string>, range: Maybe<string>, script: Maybe<string>, meta: Maybe<{ __typename?: 'FilterMetaTimelineResult', alias: Maybe<string>, controlledBy: Maybe<string>, disabled: Maybe<boolean>, field: Maybe<string>, formattedValue: Maybe<string>, index: Maybe<string>, key: Maybe<string>, negate: Maybe<boolean>, params: Maybe<string>, type: Maybe<string>, value: Maybe<string> }> }>>, kqlQuery: Maybe<{ __typename?: 'SerializedFilterQueryResult', filterQuery: Maybe<{ __typename?: 'SerializedKueryQueryResult', serializedQuery: Maybe<string>, kuery: Maybe<{ __typename?: 'KueryFilterQueryResult', kind: Maybe<string>, expression: Maybe<string> }> }> }>, dateRange: Maybe<{ __typename?: 'DateRangePickerResult', start: Maybe<number>, end: Maybe<number> }>, sort: Maybe<{ __typename?: 'SortTimelineResult', columnId: Maybe<string>, sortDirection: Maybe<string> }> } } };

export type PersistTimelinePinnedEventMutationMutationVariables = {
  pinnedEventId?: Maybe<Scalars['ID']>,
  eventId: Scalars['ID'],
  timelineId?: Maybe<Scalars['ID']>
};


export type PersistTimelinePinnedEventMutationMutation = { __typename?: 'Mutation', persistPinnedEventOnTimeline: Maybe<{ __typename?: 'PinnedEvent', pinnedEventId: string, eventId: Maybe<string>, timelineId: Maybe<string>, timelineVersion: Maybe<string>, created: Maybe<number>, createdBy: Maybe<string>, updated: Maybe<number>, updatedBy: Maybe<string>, version: Maybe<string> }> };

export type GetTlsQueryQueryVariables = {
  sourceId: Scalars['ID'],
  filterQuery?: Maybe<Scalars['String']>,
  flowTarget: FlowTargetSourceDest,
  ip: Scalars['String'],
  pagination: PaginationInputPaginated,
  sort: TlsSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetTlsQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, Tls: { __typename?: 'TlsData', totalCount: number, edges: Array<{ __typename?: 'TlsEdges', node: { __typename?: 'TlsNode', _id: Maybe<string>, alternativeNames: Maybe<Array<string>>, commonNames: Maybe<Array<string>>, ja3: Maybe<Array<string>>, issuerNames: Maybe<Array<string>>, notAfter: Maybe<Array<string>> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetUncommonProcessesQueryQueryVariables = {
  sourceId: Scalars['ID'],
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetUncommonProcessesQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, UncommonProcesses: { __typename?: 'UncommonProcessesData', totalCount: number, edges: Array<{ __typename?: 'UncommonProcessesEdges', node: { __typename?: 'UncommonProcessItem', _id: string, instances: number, process: { __typename?: 'ProcessEcsFields', args: Maybe<string[]>, name: Maybe<string[]> }, user: Maybe<{ __typename?: 'UserEcsFields', id: Maybe<string[]>, name: Maybe<string[]> }>, hosts: Array<{ __typename?: 'HostEcsFields', name: Maybe<string[]> }> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export type GetUsersQueryQueryVariables = {
  sourceId: Scalars['ID'],
  filterQuery?: Maybe<Scalars['String']>,
  flowTarget: FlowTarget,
  ip: Scalars['String'],
  pagination: PaginationInputPaginated,
  sort: UsersSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>,
  inspect: Scalars['Boolean']
};


export type GetUsersQueryQuery = { __typename?: 'Query', source: { __typename?: 'Source', id: string, Users: { __typename?: 'UsersData', totalCount: number, edges: Array<{ __typename?: 'UsersEdges', node: { __typename?: 'UsersNode', user: Maybe<{ __typename?: 'UsersItem', name: Maybe<string>, id: Maybe<string[]>, groupId: Maybe<string[]>, groupName: Maybe<string[]>, count: Maybe<number> }> }, cursor: { __typename?: 'CursorType', value: Maybe<string> } }>, pageInfo: { __typename?: 'PageInfoPaginated', activePage: number, fakeTotalCount: number, showMorePagesIndicator: boolean }, inspect: Maybe<{ __typename?: 'Inspect', dsl: Array<string>, response: Array<string> }> } } };

export const KpiHostDetailsChartFieldsFragmentDoc = gql`
    fragment KpiHostDetailsChartFields on KpiHostHistogramData {
  x
  y
}
    `;
export const KpiHostChartFieldsFragmentDoc = gql`
    fragment KpiHostChartFields on KpiHostHistogramData {
  x
  y
}
    `;
export const KpiNetworkChartFieldsFragmentDoc = gql`
    fragment KpiNetworkChartFields on KpiNetworkHistogramData {
  x
  y
}
    `;
export const GetAlertsOverTimeQueryDocument = gql`
    query GetAlertsOverTimeQuery($sourceId: ID!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $filterQuery: String, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    AlertsHistogram(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      alertsOverTimeByModule {
        x
        y
        g
      }
      totalCount
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetAlertsOverTimeQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables>, 'query'> & ({ variables: GetAlertsOverTimeQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetAlertsOverTimeQueryComponent = (props: GetAlertsOverTimeQueryComponentProps) => (
      <ApolloReactComponents.Query<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables> query={GetAlertsOverTimeQueryDocument} {...props} />
    );
    

/**
 * __useGetAlertsOverTimeQueryQuery__
 *
 * To run a query within a React component, call `useGetAlertsOverTimeQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAlertsOverTimeQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAlertsOverTimeQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      filterQuery: // value for 'filterQuery'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetAlertsOverTimeQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables>(GetAlertsOverTimeQueryDocument, baseOptions);
      }
export function useGetAlertsOverTimeQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables>(GetAlertsOverTimeQueryDocument, baseOptions);
        }
export type GetAlertsOverTimeQueryQueryHookResult = ReturnType<typeof useGetAlertsOverTimeQueryQuery>;
export type GetAlertsOverTimeQueryLazyQueryHookResult = ReturnType<typeof useGetAlertsOverTimeQueryLazyQuery>;
export type GetAlertsOverTimeQueryQueryResult = ApolloReactCommon.QueryResult<GetAlertsOverTimeQueryQuery, GetAlertsOverTimeQueryQueryVariables>;
export const GetAnomaliesOverTimeQueryDocument = gql`
    query GetAnomaliesOverTimeQuery($sourceId: ID!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $filterQuery: String, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    AnomaliesOverTime(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      anomaliesOverTime {
        x
        y
        g
      }
      totalCount
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetAnomaliesOverTimeQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables>, 'query'> & ({ variables: GetAnomaliesOverTimeQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetAnomaliesOverTimeQueryComponent = (props: GetAnomaliesOverTimeQueryComponentProps) => (
      <ApolloReactComponents.Query<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables> query={GetAnomaliesOverTimeQueryDocument} {...props} />
    );
    

/**
 * __useGetAnomaliesOverTimeQueryQuery__
 *
 * To run a query within a React component, call `useGetAnomaliesOverTimeQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAnomaliesOverTimeQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAnomaliesOverTimeQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      filterQuery: // value for 'filterQuery'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetAnomaliesOverTimeQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables>(GetAnomaliesOverTimeQueryDocument, baseOptions);
      }
export function useGetAnomaliesOverTimeQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables>(GetAnomaliesOverTimeQueryDocument, baseOptions);
        }
export type GetAnomaliesOverTimeQueryQueryHookResult = ReturnType<typeof useGetAnomaliesOverTimeQueryQuery>;
export type GetAnomaliesOverTimeQueryLazyQueryHookResult = ReturnType<typeof useGetAnomaliesOverTimeQueryLazyQuery>;
export type GetAnomaliesOverTimeQueryQueryResult = ApolloReactCommon.QueryResult<GetAnomaliesOverTimeQueryQuery, GetAnomaliesOverTimeQueryQueryVariables>;
export const GetAuthenticationsOverTimeQueryDocument = gql`
    query GetAuthenticationsOverTimeQuery($sourceId: ID!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $filterQuery: String, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    AuthenticationsOverTime(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      authenticationsOverTime {
        x
        y
        g
      }
      totalCount
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetAuthenticationsOverTimeQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables>, 'query'> & ({ variables: GetAuthenticationsOverTimeQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetAuthenticationsOverTimeQueryComponent = (props: GetAuthenticationsOverTimeQueryComponentProps) => (
      <ApolloReactComponents.Query<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables> query={GetAuthenticationsOverTimeQueryDocument} {...props} />
    );
    

/**
 * __useGetAuthenticationsOverTimeQueryQuery__
 *
 * To run a query within a React component, call `useGetAuthenticationsOverTimeQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAuthenticationsOverTimeQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAuthenticationsOverTimeQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      filterQuery: // value for 'filterQuery'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetAuthenticationsOverTimeQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables>(GetAuthenticationsOverTimeQueryDocument, baseOptions);
      }
export function useGetAuthenticationsOverTimeQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables>(GetAuthenticationsOverTimeQueryDocument, baseOptions);
        }
export type GetAuthenticationsOverTimeQueryQueryHookResult = ReturnType<typeof useGetAuthenticationsOverTimeQueryQuery>;
export type GetAuthenticationsOverTimeQueryLazyQueryHookResult = ReturnType<typeof useGetAuthenticationsOverTimeQueryLazyQuery>;
export type GetAuthenticationsOverTimeQueryQueryResult = ApolloReactCommon.QueryResult<GetAuthenticationsOverTimeQueryQuery, GetAuthenticationsOverTimeQueryQueryVariables>;
export const GetAuthenticationsQueryDocument = gql`
    query GetAuthenticationsQuery($sourceId: ID!, $timerange: TimerangeInput!, $pagination: PaginationInputPaginated!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    Authentications(timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          _id
          failures
          successes
          user {
            name
          }
          lastSuccess {
            timestamp
            source {
              ip
            }
            host {
              id
              name
            }
          }
          lastFailure {
            timestamp
            source {
              ip
            }
            host {
              id
              name
            }
          }
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetAuthenticationsQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables>, 'query'> & ({ variables: GetAuthenticationsQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetAuthenticationsQueryComponent = (props: GetAuthenticationsQueryComponentProps) => (
      <ApolloReactComponents.Query<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables> query={GetAuthenticationsQueryDocument} {...props} />
    );
    

/**
 * __useGetAuthenticationsQueryQuery__
 *
 * To run a query within a React component, call `useGetAuthenticationsQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAuthenticationsQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAuthenticationsQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      pagination: // value for 'pagination'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetAuthenticationsQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables>(GetAuthenticationsQueryDocument, baseOptions);
      }
export function useGetAuthenticationsQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables>(GetAuthenticationsQueryDocument, baseOptions);
        }
export type GetAuthenticationsQueryQueryHookResult = ReturnType<typeof useGetAuthenticationsQueryQuery>;
export type GetAuthenticationsQueryLazyQueryHookResult = ReturnType<typeof useGetAuthenticationsQueryLazyQuery>;
export type GetAuthenticationsQueryQueryResult = ApolloReactCommon.QueryResult<GetAuthenticationsQueryQuery, GetAuthenticationsQueryQueryVariables>;
export const GetEventsOverTimeQueryDocument = gql`
    query GetEventsOverTimeQuery($sourceId: ID!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $filterQuery: String, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    EventsOverTime(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      eventsOverTime {
        x
        y
        g
      }
      totalCount
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetEventsOverTimeQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables>, 'query'> & ({ variables: GetEventsOverTimeQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetEventsOverTimeQueryComponent = (props: GetEventsOverTimeQueryComponentProps) => (
      <ApolloReactComponents.Query<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables> query={GetEventsOverTimeQueryDocument} {...props} />
    );
    

/**
 * __useGetEventsOverTimeQueryQuery__
 *
 * To run a query within a React component, call `useGetEventsOverTimeQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventsOverTimeQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventsOverTimeQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      filterQuery: // value for 'filterQuery'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetEventsOverTimeQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables>(GetEventsOverTimeQueryDocument, baseOptions);
      }
export function useGetEventsOverTimeQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables>(GetEventsOverTimeQueryDocument, baseOptions);
        }
export type GetEventsOverTimeQueryQueryHookResult = ReturnType<typeof useGetEventsOverTimeQueryQuery>;
export type GetEventsOverTimeQueryLazyQueryHookResult = ReturnType<typeof useGetEventsOverTimeQueryLazyQuery>;
export type GetEventsOverTimeQueryQueryResult = ApolloReactCommon.QueryResult<GetEventsOverTimeQueryQuery, GetEventsOverTimeQueryQueryVariables>;
export const GetLastEventTimeQueryDocument = gql`
    query GetLastEventTimeQuery($sourceId: ID!, $indexKey: LastEventIndexKey!, $details: LastTimeDetails!, $defaultIndex: [String!]!) {
  source(id: $sourceId) {
    id
    LastEventTime(indexKey: $indexKey, details: $details, defaultIndex: $defaultIndex) {
      lastSeen
    }
  }
}
    `;
export type GetLastEventTimeQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables>, 'query'> & ({ variables: GetLastEventTimeQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetLastEventTimeQueryComponent = (props: GetLastEventTimeQueryComponentProps) => (
      <ApolloReactComponents.Query<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables> query={GetLastEventTimeQueryDocument} {...props} />
    );
    

/**
 * __useGetLastEventTimeQueryQuery__
 *
 * To run a query within a React component, call `useGetLastEventTimeQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLastEventTimeQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLastEventTimeQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      indexKey: // value for 'indexKey'
 *      details: // value for 'details'
 *      defaultIndex: // value for 'defaultIndex'
 *   },
 * });
 */
export function useGetLastEventTimeQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables>(GetLastEventTimeQueryDocument, baseOptions);
      }
export function useGetLastEventTimeQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables>(GetLastEventTimeQueryDocument, baseOptions);
        }
export type GetLastEventTimeQueryQueryHookResult = ReturnType<typeof useGetLastEventTimeQueryQuery>;
export type GetLastEventTimeQueryLazyQueryHookResult = ReturnType<typeof useGetLastEventTimeQueryLazyQuery>;
export type GetLastEventTimeQueryQueryResult = ApolloReactCommon.QueryResult<GetLastEventTimeQueryQuery, GetLastEventTimeQueryQueryVariables>;
export const GetHostFirstLastSeenQueryDocument = gql`
    query GetHostFirstLastSeenQuery($sourceId: ID!, $hostName: String!, $defaultIndex: [String!]!) {
  source(id: $sourceId) {
    id
    HostFirstLastSeen(hostName: $hostName, defaultIndex: $defaultIndex) {
      firstSeen
      lastSeen
    }
  }
}
    `;
export type GetHostFirstLastSeenQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables>, 'query'> & ({ variables: GetHostFirstLastSeenQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetHostFirstLastSeenQueryComponent = (props: GetHostFirstLastSeenQueryComponentProps) => (
      <ApolloReactComponents.Query<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables> query={GetHostFirstLastSeenQueryDocument} {...props} />
    );
    

/**
 * __useGetHostFirstLastSeenQueryQuery__
 *
 * To run a query within a React component, call `useGetHostFirstLastSeenQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostFirstLastSeenQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostFirstLastSeenQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      hostName: // value for 'hostName'
 *      defaultIndex: // value for 'defaultIndex'
 *   },
 * });
 */
export function useGetHostFirstLastSeenQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables>(GetHostFirstLastSeenQueryDocument, baseOptions);
      }
export function useGetHostFirstLastSeenQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables>(GetHostFirstLastSeenQueryDocument, baseOptions);
        }
export type GetHostFirstLastSeenQueryQueryHookResult = ReturnType<typeof useGetHostFirstLastSeenQueryQuery>;
export type GetHostFirstLastSeenQueryLazyQueryHookResult = ReturnType<typeof useGetHostFirstLastSeenQueryLazyQuery>;
export type GetHostFirstLastSeenQueryQueryResult = ApolloReactCommon.QueryResult<GetHostFirstLastSeenQueryQuery, GetHostFirstLastSeenQueryQueryVariables>;
export const GetHostsTableQueryDocument = gql`
    query GetHostsTableQuery($sourceId: ID!, $timerange: TimerangeInput!, $pagination: PaginationInputPaginated!, $sort: HostsSortField!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    Hosts(timerange: $timerange, pagination: $pagination, sort: $sort, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          _id
          lastSeen
          host {
            id
            name
            os {
              name
              version
            }
          }
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetHostsTableQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables>, 'query'> & ({ variables: GetHostsTableQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetHostsTableQueryComponent = (props: GetHostsTableQueryComponentProps) => (
      <ApolloReactComponents.Query<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables> query={GetHostsTableQueryDocument} {...props} />
    );
    

/**
 * __useGetHostsTableQueryQuery__
 *
 * To run a query within a React component, call `useGetHostsTableQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostsTableQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostsTableQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      pagination: // value for 'pagination'
 *      sort: // value for 'sort'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetHostsTableQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables>(GetHostsTableQueryDocument, baseOptions);
      }
export function useGetHostsTableQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables>(GetHostsTableQueryDocument, baseOptions);
        }
export type GetHostsTableQueryQueryHookResult = ReturnType<typeof useGetHostsTableQueryQuery>;
export type GetHostsTableQueryLazyQueryHookResult = ReturnType<typeof useGetHostsTableQueryLazyQuery>;
export type GetHostsTableQueryQueryResult = ApolloReactCommon.QueryResult<GetHostsTableQueryQuery, GetHostsTableQueryQueryVariables>;
export const GetHostOverviewQueryDocument = gql`
    query GetHostOverviewQuery($sourceId: ID!, $hostName: String!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    HostOverview(hostName: $hostName, timerange: $timerange, defaultIndex: $defaultIndex) {
      _id
      host {
        architecture
        id
        ip
        mac
        name
        os {
          family
          name
          platform
          version
        }
        type
      }
      cloud {
        instance {
          id
        }
        machine {
          type
        }
        provider
        region
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetHostOverviewQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables>, 'query'> & ({ variables: GetHostOverviewQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetHostOverviewQueryComponent = (props: GetHostOverviewQueryComponentProps) => (
      <ApolloReactComponents.Query<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables> query={GetHostOverviewQueryDocument} {...props} />
    );
    

/**
 * __useGetHostOverviewQueryQuery__
 *
 * To run a query within a React component, call `useGetHostOverviewQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostOverviewQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostOverviewQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      hostName: // value for 'hostName'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetHostOverviewQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables>(GetHostOverviewQueryDocument, baseOptions);
      }
export function useGetHostOverviewQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables>(GetHostOverviewQueryDocument, baseOptions);
        }
export type GetHostOverviewQueryQueryHookResult = ReturnType<typeof useGetHostOverviewQueryQuery>;
export type GetHostOverviewQueryLazyQueryHookResult = ReturnType<typeof useGetHostOverviewQueryLazyQuery>;
export type GetHostOverviewQueryQueryResult = ApolloReactCommon.QueryResult<GetHostOverviewQueryQuery, GetHostOverviewQueryQueryVariables>;
export const GetIpOverviewQueryDocument = gql`
    query GetIpOverviewQuery($sourceId: ID!, $filterQuery: String, $ip: String!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    IpOverview(filterQuery: $filterQuery, ip: $ip, defaultIndex: $defaultIndex) {
      source {
        firstSeen
        lastSeen
        autonomousSystem {
          number
          organization {
            name
          }
        }
        geo {
          continent_name
          city_name
          country_iso_code
          country_name
          location {
            lat
            lon
          }
          region_iso_code
          region_name
        }
      }
      destination {
        firstSeen
        lastSeen
        autonomousSystem {
          number
          organization {
            name
          }
        }
        geo {
          continent_name
          city_name
          country_iso_code
          country_name
          location {
            lat
            lon
          }
          region_iso_code
          region_name
        }
      }
      host {
        architecture
        id
        ip
        mac
        name
        os {
          family
          name
          platform
          version
        }
        type
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetIpOverviewQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables>, 'query'> & ({ variables: GetIpOverviewQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetIpOverviewQueryComponent = (props: GetIpOverviewQueryComponentProps) => (
      <ApolloReactComponents.Query<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables> query={GetIpOverviewQueryDocument} {...props} />
    );
    

/**
 * __useGetIpOverviewQueryQuery__
 *
 * To run a query within a React component, call `useGetIpOverviewQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetIpOverviewQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetIpOverviewQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      filterQuery: // value for 'filterQuery'
 *      ip: // value for 'ip'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetIpOverviewQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables>(GetIpOverviewQueryDocument, baseOptions);
      }
export function useGetIpOverviewQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables>(GetIpOverviewQueryDocument, baseOptions);
        }
export type GetIpOverviewQueryQueryHookResult = ReturnType<typeof useGetIpOverviewQueryQuery>;
export type GetIpOverviewQueryLazyQueryHookResult = ReturnType<typeof useGetIpOverviewQueryLazyQuery>;
export type GetIpOverviewQueryQueryResult = ApolloReactCommon.QueryResult<GetIpOverviewQueryQuery, GetIpOverviewQueryQueryVariables>;
export const GetKpiHostDetailsQueryDocument = gql`
    query GetKpiHostDetailsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    KpiHostDetails(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      authSuccess
      authSuccessHistogram {
        ...KpiHostDetailsChartFields
      }
      authFailure
      authFailureHistogram {
        ...KpiHostDetailsChartFields
      }
      uniqueSourceIps
      uniqueSourceIpsHistogram {
        ...KpiHostDetailsChartFields
      }
      uniqueDestinationIps
      uniqueDestinationIpsHistogram {
        ...KpiHostDetailsChartFields
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    ${KpiHostDetailsChartFieldsFragmentDoc}`;
export type GetKpiHostDetailsQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables>, 'query'> & ({ variables: GetKpiHostDetailsQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetKpiHostDetailsQueryComponent = (props: GetKpiHostDetailsQueryComponentProps) => (
      <ApolloReactComponents.Query<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables> query={GetKpiHostDetailsQueryDocument} {...props} />
    );
    

/**
 * __useGetKpiHostDetailsQueryQuery__
 *
 * To run a query within a React component, call `useGetKpiHostDetailsQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetKpiHostDetailsQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetKpiHostDetailsQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetKpiHostDetailsQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables>(GetKpiHostDetailsQueryDocument, baseOptions);
      }
export function useGetKpiHostDetailsQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables>(GetKpiHostDetailsQueryDocument, baseOptions);
        }
export type GetKpiHostDetailsQueryQueryHookResult = ReturnType<typeof useGetKpiHostDetailsQueryQuery>;
export type GetKpiHostDetailsQueryLazyQueryHookResult = ReturnType<typeof useGetKpiHostDetailsQueryLazyQuery>;
export type GetKpiHostDetailsQueryQueryResult = ApolloReactCommon.QueryResult<GetKpiHostDetailsQueryQuery, GetKpiHostDetailsQueryQueryVariables>;
export const GetKpiHostsQueryDocument = gql`
    query GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    KpiHosts(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      hosts
      hostsHistogram {
        ...KpiHostChartFields
      }
      authSuccess
      authSuccessHistogram {
        ...KpiHostChartFields
      }
      authFailure
      authFailureHistogram {
        ...KpiHostChartFields
      }
      uniqueSourceIps
      uniqueSourceIpsHistogram {
        ...KpiHostChartFields
      }
      uniqueDestinationIps
      uniqueDestinationIpsHistogram {
        ...KpiHostChartFields
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    ${KpiHostChartFieldsFragmentDoc}`;
export type GetKpiHostsQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables>, 'query'> & ({ variables: GetKpiHostsQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetKpiHostsQueryComponent = (props: GetKpiHostsQueryComponentProps) => (
      <ApolloReactComponents.Query<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables> query={GetKpiHostsQueryDocument} {...props} />
    );
    

/**
 * __useGetKpiHostsQueryQuery__
 *
 * To run a query within a React component, call `useGetKpiHostsQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetKpiHostsQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetKpiHostsQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetKpiHostsQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables>(GetKpiHostsQueryDocument, baseOptions);
      }
export function useGetKpiHostsQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables>(GetKpiHostsQueryDocument, baseOptions);
        }
export type GetKpiHostsQueryQueryHookResult = ReturnType<typeof useGetKpiHostsQueryQuery>;
export type GetKpiHostsQueryLazyQueryHookResult = ReturnType<typeof useGetKpiHostsQueryLazyQuery>;
export type GetKpiHostsQueryQueryResult = ApolloReactCommon.QueryResult<GetKpiHostsQueryQuery, GetKpiHostsQueryQueryVariables>;
export const GetKpiNetworkQueryDocument = gql`
    query GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    KpiNetwork(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      networkEvents
      uniqueFlowId
      uniqueSourcePrivateIps
      uniqueSourcePrivateIpsHistogram {
        ...KpiNetworkChartFields
      }
      uniqueDestinationPrivateIps
      uniqueDestinationPrivateIpsHistogram {
        ...KpiNetworkChartFields
      }
      dnsQueries
      tlsHandshakes
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    ${KpiNetworkChartFieldsFragmentDoc}`;
export type GetKpiNetworkQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables>, 'query'> & ({ variables: GetKpiNetworkQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetKpiNetworkQueryComponent = (props: GetKpiNetworkQueryComponentProps) => (
      <ApolloReactComponents.Query<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables> query={GetKpiNetworkQueryDocument} {...props} />
    );
    

/**
 * __useGetKpiNetworkQueryQuery__
 *
 * To run a query within a React component, call `useGetKpiNetworkQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetKpiNetworkQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetKpiNetworkQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetKpiNetworkQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables>(GetKpiNetworkQueryDocument, baseOptions);
      }
export function useGetKpiNetworkQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables>(GetKpiNetworkQueryDocument, baseOptions);
        }
export type GetKpiNetworkQueryQueryHookResult = ReturnType<typeof useGetKpiNetworkQueryQuery>;
export type GetKpiNetworkQueryLazyQueryHookResult = ReturnType<typeof useGetKpiNetworkQueryLazyQuery>;
export type GetKpiNetworkQueryQueryResult = ApolloReactCommon.QueryResult<GetKpiNetworkQueryQuery, GetKpiNetworkQueryQueryVariables>;
export const GetNetworkDnsQueryDocument = gql`
    query GetNetworkDnsQuery($sourceId: ID!, $sort: NetworkDnsSortField!, $isPtrIncluded: Boolean!, $timerange: TimerangeInput!, $pagination: PaginationInputPaginated!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    NetworkDns(isPtrIncluded: $isPtrIncluded, sort: $sort, timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          _id
          dnsBytesIn
          dnsBytesOut
          dnsName
          queryCount
          uniqueDomains
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
      histogram {
        x
        y
        g
      }
    }
  }
}
    `;
export type GetNetworkDnsQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables>, 'query'> & ({ variables: GetNetworkDnsQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetNetworkDnsQueryComponent = (props: GetNetworkDnsQueryComponentProps) => (
      <ApolloReactComponents.Query<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables> query={GetNetworkDnsQueryDocument} {...props} />
    );
    

/**
 * __useGetNetworkDnsQueryQuery__
 *
 * To run a query within a React component, call `useGetNetworkDnsQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNetworkDnsQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNetworkDnsQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      sort: // value for 'sort'
 *      isPtrIncluded: // value for 'isPtrIncluded'
 *      timerange: // value for 'timerange'
 *      pagination: // value for 'pagination'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetNetworkDnsQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables>(GetNetworkDnsQueryDocument, baseOptions);
      }
export function useGetNetworkDnsQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables>(GetNetworkDnsQueryDocument, baseOptions);
        }
export type GetNetworkDnsQueryQueryHookResult = ReturnType<typeof useGetNetworkDnsQueryQuery>;
export type GetNetworkDnsQueryLazyQueryHookResult = ReturnType<typeof useGetNetworkDnsQueryLazyQuery>;
export type GetNetworkDnsQueryQueryResult = ApolloReactCommon.QueryResult<GetNetworkDnsQueryQuery, GetNetworkDnsQueryQueryVariables>;
export const GetNetworkHttpQueryDocument = gql`
    query GetNetworkHttpQuery($sourceId: ID!, $ip: String, $filterQuery: String, $pagination: PaginationInputPaginated!, $sort: NetworkHttpSortField!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    NetworkHttp(filterQuery: $filterQuery, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          domains
          lastHost
          lastSourceIp
          methods
          path
          requestCount
          statuses
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetNetworkHttpQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables>, 'query'> & ({ variables: GetNetworkHttpQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetNetworkHttpQueryComponent = (props: GetNetworkHttpQueryComponentProps) => (
      <ApolloReactComponents.Query<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables> query={GetNetworkHttpQueryDocument} {...props} />
    );
    

/**
 * __useGetNetworkHttpQueryQuery__
 *
 * To run a query within a React component, call `useGetNetworkHttpQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNetworkHttpQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNetworkHttpQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      ip: // value for 'ip'
 *      filterQuery: // value for 'filterQuery'
 *      pagination: // value for 'pagination'
 *      sort: // value for 'sort'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetNetworkHttpQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables>(GetNetworkHttpQueryDocument, baseOptions);
      }
export function useGetNetworkHttpQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables>(GetNetworkHttpQueryDocument, baseOptions);
        }
export type GetNetworkHttpQueryQueryHookResult = ReturnType<typeof useGetNetworkHttpQueryQuery>;
export type GetNetworkHttpQueryLazyQueryHookResult = ReturnType<typeof useGetNetworkHttpQueryLazyQuery>;
export type GetNetworkHttpQueryQueryResult = ApolloReactCommon.QueryResult<GetNetworkHttpQueryQuery, GetNetworkHttpQueryQueryVariables>;
export const GetNetworkTopCountriesQueryDocument = gql`
    query GetNetworkTopCountriesQuery($sourceId: ID!, $ip: String, $filterQuery: String, $pagination: PaginationInputPaginated!, $sort: NetworkTopTablesSortField!, $flowTarget: FlowTargetSourceDest!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    NetworkTopCountries(filterQuery: $filterQuery, flowTarget: $flowTarget, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          source {
            country
            destination_ips
            flows
            source_ips
          }
          destination {
            country
            destination_ips
            flows
            source_ips
          }
          network {
            bytes_in
            bytes_out
          }
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetNetworkTopCountriesQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables>, 'query'> & ({ variables: GetNetworkTopCountriesQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetNetworkTopCountriesQueryComponent = (props: GetNetworkTopCountriesQueryComponentProps) => (
      <ApolloReactComponents.Query<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables> query={GetNetworkTopCountriesQueryDocument} {...props} />
    );
    

/**
 * __useGetNetworkTopCountriesQueryQuery__
 *
 * To run a query within a React component, call `useGetNetworkTopCountriesQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNetworkTopCountriesQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNetworkTopCountriesQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      ip: // value for 'ip'
 *      filterQuery: // value for 'filterQuery'
 *      pagination: // value for 'pagination'
 *      sort: // value for 'sort'
 *      flowTarget: // value for 'flowTarget'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetNetworkTopCountriesQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables>(GetNetworkTopCountriesQueryDocument, baseOptions);
      }
export function useGetNetworkTopCountriesQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables>(GetNetworkTopCountriesQueryDocument, baseOptions);
        }
export type GetNetworkTopCountriesQueryQueryHookResult = ReturnType<typeof useGetNetworkTopCountriesQueryQuery>;
export type GetNetworkTopCountriesQueryLazyQueryHookResult = ReturnType<typeof useGetNetworkTopCountriesQueryLazyQuery>;
export type GetNetworkTopCountriesQueryQueryResult = ApolloReactCommon.QueryResult<GetNetworkTopCountriesQueryQuery, GetNetworkTopCountriesQueryQueryVariables>;
export const GetNetworkTopNFlowQueryDocument = gql`
    query GetNetworkTopNFlowQuery($sourceId: ID!, $ip: String, $filterQuery: String, $pagination: PaginationInputPaginated!, $sort: NetworkTopTablesSortField!, $flowTarget: FlowTargetSourceDest!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    NetworkTopNFlow(filterQuery: $filterQuery, flowTarget: $flowTarget, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          source {
            autonomous_system {
              name
              number
            }
            domain
            ip
            location {
              geo {
                continent_name
                country_name
                country_iso_code
                city_name
                region_iso_code
                region_name
              }
              flowTarget
            }
            flows
            destination_ips
          }
          destination {
            autonomous_system {
              name
              number
            }
            domain
            ip
            location {
              geo {
                continent_name
                country_name
                country_iso_code
                city_name
                region_iso_code
                region_name
              }
              flowTarget
            }
            flows
            source_ips
          }
          network {
            bytes_in
            bytes_out
          }
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetNetworkTopNFlowQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables>, 'query'> & ({ variables: GetNetworkTopNFlowQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetNetworkTopNFlowQueryComponent = (props: GetNetworkTopNFlowQueryComponentProps) => (
      <ApolloReactComponents.Query<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables> query={GetNetworkTopNFlowQueryDocument} {...props} />
    );
    

/**
 * __useGetNetworkTopNFlowQueryQuery__
 *
 * To run a query within a React component, call `useGetNetworkTopNFlowQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNetworkTopNFlowQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNetworkTopNFlowQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      ip: // value for 'ip'
 *      filterQuery: // value for 'filterQuery'
 *      pagination: // value for 'pagination'
 *      sort: // value for 'sort'
 *      flowTarget: // value for 'flowTarget'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetNetworkTopNFlowQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables>(GetNetworkTopNFlowQueryDocument, baseOptions);
      }
export function useGetNetworkTopNFlowQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables>(GetNetworkTopNFlowQueryDocument, baseOptions);
        }
export type GetNetworkTopNFlowQueryQueryHookResult = ReturnType<typeof useGetNetworkTopNFlowQueryQuery>;
export type GetNetworkTopNFlowQueryLazyQueryHookResult = ReturnType<typeof useGetNetworkTopNFlowQueryLazyQuery>;
export type GetNetworkTopNFlowQueryQueryResult = ApolloReactCommon.QueryResult<GetNetworkTopNFlowQueryQuery, GetNetworkTopNFlowQueryQueryVariables>;
export const GetOverviewHostQueryDocument = gql`
    query GetOverviewHostQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    OverviewHost(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      auditbeatAuditd
      auditbeatFIM
      auditbeatLogin
      auditbeatPackage
      auditbeatProcess
      auditbeatUser
      endgameDns
      endgameFile
      endgameImageLoad
      endgameNetwork
      endgameProcess
      endgameRegistry
      endgameSecurity
      filebeatSystemModule
      winlogbeat
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetOverviewHostQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables>, 'query'> & ({ variables: GetOverviewHostQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetOverviewHostQueryComponent = (props: GetOverviewHostQueryComponentProps) => (
      <ApolloReactComponents.Query<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables> query={GetOverviewHostQueryDocument} {...props} />
    );
    

/**
 * __useGetOverviewHostQueryQuery__
 *
 * To run a query within a React component, call `useGetOverviewHostQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOverviewHostQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOverviewHostQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetOverviewHostQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables>(GetOverviewHostQueryDocument, baseOptions);
      }
export function useGetOverviewHostQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables>(GetOverviewHostQueryDocument, baseOptions);
        }
export type GetOverviewHostQueryQueryHookResult = ReturnType<typeof useGetOverviewHostQueryQuery>;
export type GetOverviewHostQueryLazyQueryHookResult = ReturnType<typeof useGetOverviewHostQueryLazyQuery>;
export type GetOverviewHostQueryQueryResult = ApolloReactCommon.QueryResult<GetOverviewHostQueryQuery, GetOverviewHostQueryQueryVariables>;
export const GetOverviewNetworkQueryDocument = gql`
    query GetOverviewNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    OverviewNetwork(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      auditbeatSocket
      filebeatCisco
      filebeatNetflow
      filebeatPanw
      filebeatSuricata
      filebeatZeek
      packetbeatDNS
      packetbeatFlow
      packetbeatTLS
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetOverviewNetworkQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables>, 'query'> & ({ variables: GetOverviewNetworkQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetOverviewNetworkQueryComponent = (props: GetOverviewNetworkQueryComponentProps) => (
      <ApolloReactComponents.Query<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables> query={GetOverviewNetworkQueryDocument} {...props} />
    );
    

/**
 * __useGetOverviewNetworkQueryQuery__
 *
 * To run a query within a React component, call `useGetOverviewNetworkQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOverviewNetworkQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOverviewNetworkQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetOverviewNetworkQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables>(GetOverviewNetworkQueryDocument, baseOptions);
      }
export function useGetOverviewNetworkQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables>(GetOverviewNetworkQueryDocument, baseOptions);
        }
export type GetOverviewNetworkQueryQueryHookResult = ReturnType<typeof useGetOverviewNetworkQueryQuery>;
export type GetOverviewNetworkQueryLazyQueryHookResult = ReturnType<typeof useGetOverviewNetworkQueryLazyQuery>;
export type GetOverviewNetworkQueryQueryResult = ApolloReactCommon.QueryResult<GetOverviewNetworkQueryQuery, GetOverviewNetworkQueryQueryVariables>;
export const SourceQueryDocument = gql`
    query SourceQuery($sourceId: ID = "default", $defaultIndex: [String!]!) {
  source(id: $sourceId) {
    id
    status {
      indicesExist(defaultIndex: $defaultIndex)
      indexFields(defaultIndex: $defaultIndex) {
        category
        description
        example
        indexes
        name
        searchable
        type
        aggregatable
        format
      }
    }
  }
}
    `;
export type SourceQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<SourceQueryQuery, SourceQueryQueryVariables>, 'query'> & ({ variables: SourceQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const SourceQueryComponent = (props: SourceQueryComponentProps) => (
      <ApolloReactComponents.Query<SourceQueryQuery, SourceQueryQueryVariables> query={SourceQueryDocument} {...props} />
    );
    

/**
 * __useSourceQueryQuery__
 *
 * To run a query within a React component, call `useSourceQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useSourceQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSourceQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      defaultIndex: // value for 'defaultIndex'
 *   },
 * });
 */
export function useSourceQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SourceQueryQuery, SourceQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<SourceQueryQuery, SourceQueryQueryVariables>(SourceQueryDocument, baseOptions);
      }
export function useSourceQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SourceQueryQuery, SourceQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<SourceQueryQuery, SourceQueryQueryVariables>(SourceQueryDocument, baseOptions);
        }
export type SourceQueryQueryHookResult = ReturnType<typeof useSourceQueryQuery>;
export type SourceQueryLazyQueryHookResult = ReturnType<typeof useSourceQueryLazyQuery>;
export type SourceQueryQueryResult = ApolloReactCommon.QueryResult<SourceQueryQuery, SourceQueryQueryVariables>;
export const GetAllTimelineDocument = gql`
    query GetAllTimeline($pageInfo: PageInfoTimeline!, $search: String, $sort: SortTimeline, $onlyUserFavorite: Boolean) {
  getAllTimeline(pageInfo: $pageInfo, search: $search, sort: $sort, onlyUserFavorite: $onlyUserFavorite) {
    totalCount
    timeline {
      savedObjectId
      description
      favorite {
        fullName
        userName
        favoriteDate
      }
      eventIdToNoteIds {
        eventId
        note
        timelineId
        noteId
        created
        createdBy
        timelineVersion
        updated
        updatedBy
        version
      }
      notes {
        eventId
        note
        timelineId
        timelineVersion
        noteId
        created
        createdBy
        updated
        updatedBy
        version
      }
      noteIds
      pinnedEventIds
      title
      created
      createdBy
      updated
      updatedBy
      version
    }
  }
}
    `;
export type GetAllTimelineComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetAllTimelineQuery, GetAllTimelineQueryVariables>, 'query'> & ({ variables: GetAllTimelineQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetAllTimelineComponent = (props: GetAllTimelineComponentProps) => (
      <ApolloReactComponents.Query<GetAllTimelineQuery, GetAllTimelineQueryVariables> query={GetAllTimelineDocument} {...props} />
    );
    

/**
 * __useGetAllTimelineQuery__
 *
 * To run a query within a React component, call `useGetAllTimelineQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllTimelineQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllTimelineQuery({
 *   variables: {
 *      pageInfo: // value for 'pageInfo'
 *      search: // value for 'search'
 *      sort: // value for 'sort'
 *      onlyUserFavorite: // value for 'onlyUserFavorite'
 *   },
 * });
 */
export function useGetAllTimelineQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetAllTimelineQuery, GetAllTimelineQueryVariables>) {
        return ApolloReactHooks.useQuery<GetAllTimelineQuery, GetAllTimelineQueryVariables>(GetAllTimelineDocument, baseOptions);
      }
export function useGetAllTimelineLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAllTimelineQuery, GetAllTimelineQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetAllTimelineQuery, GetAllTimelineQueryVariables>(GetAllTimelineDocument, baseOptions);
        }
export type GetAllTimelineQueryHookResult = ReturnType<typeof useGetAllTimelineQuery>;
export type GetAllTimelineLazyQueryHookResult = ReturnType<typeof useGetAllTimelineLazyQuery>;
export type GetAllTimelineQueryResult = ApolloReactCommon.QueryResult<GetAllTimelineQuery, GetAllTimelineQueryVariables>;
export const DeleteTimelineMutationDocument = gql`
    mutation DeleteTimelineMutation($id: [ID!]!) {
  deleteTimeline(id: $id)
}
    `;
export type DeleteTimelineMutationMutationFn = ApolloReactCommon.MutationFunction<DeleteTimelineMutationMutation, DeleteTimelineMutationMutationVariables>;
export type DeleteTimelineMutationComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<DeleteTimelineMutationMutation, DeleteTimelineMutationMutationVariables>, 'mutation'>;

    export const DeleteTimelineMutationComponent = (props: DeleteTimelineMutationComponentProps) => (
      <ApolloReactComponents.Mutation<DeleteTimelineMutationMutation, DeleteTimelineMutationMutationVariables> mutation={DeleteTimelineMutationDocument} {...props} />
    );
    

/**
 * __useDeleteTimelineMutationMutation__
 *
 * To run a mutation, you first call `useDeleteTimelineMutationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTimelineMutationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTimelineMutationMutation, { data, loading, error }] = useDeleteTimelineMutationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTimelineMutationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteTimelineMutationMutation, DeleteTimelineMutationMutationVariables>) {
        return ApolloReactHooks.useMutation<DeleteTimelineMutationMutation, DeleteTimelineMutationMutationVariables>(DeleteTimelineMutationDocument, baseOptions);
      }
export type DeleteTimelineMutationMutationHookResult = ReturnType<typeof useDeleteTimelineMutationMutation>;
export type DeleteTimelineMutationMutationResult = ApolloReactCommon.MutationResult<DeleteTimelineMutationMutation>;
export type DeleteTimelineMutationMutationOptions = ApolloReactCommon.BaseMutationOptions<DeleteTimelineMutationMutation, DeleteTimelineMutationMutationVariables>;
export const GetTimelineDetailsQueryDocument = gql`
    query GetTimelineDetailsQuery($sourceId: ID!, $eventId: String!, $indexName: String!, $defaultIndex: [String!]!) {
  source(id: $sourceId) {
    id
    TimelineDetails(eventId: $eventId, indexName: $indexName, defaultIndex: $defaultIndex) {
      data {
        field
        values
        originalValue
      }
    }
  }
}
    `;
export type GetTimelineDetailsQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables>, 'query'> & ({ variables: GetTimelineDetailsQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetTimelineDetailsQueryComponent = (props: GetTimelineDetailsQueryComponentProps) => (
      <ApolloReactComponents.Query<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables> query={GetTimelineDetailsQueryDocument} {...props} />
    );
    

/**
 * __useGetTimelineDetailsQueryQuery__
 *
 * To run a query within a React component, call `useGetTimelineDetailsQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTimelineDetailsQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTimelineDetailsQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      eventId: // value for 'eventId'
 *      indexName: // value for 'indexName'
 *      defaultIndex: // value for 'defaultIndex'
 *   },
 * });
 */
export function useGetTimelineDetailsQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables>(GetTimelineDetailsQueryDocument, baseOptions);
      }
export function useGetTimelineDetailsQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables>(GetTimelineDetailsQueryDocument, baseOptions);
        }
export type GetTimelineDetailsQueryQueryHookResult = ReturnType<typeof useGetTimelineDetailsQueryQuery>;
export type GetTimelineDetailsQueryLazyQueryHookResult = ReturnType<typeof useGetTimelineDetailsQueryLazyQuery>;
export type GetTimelineDetailsQueryQueryResult = ApolloReactCommon.QueryResult<GetTimelineDetailsQueryQuery, GetTimelineDetailsQueryQueryVariables>;
export const PersistTimelineFavoriteMutationDocument = gql`
    mutation PersistTimelineFavoriteMutation($timelineId: ID) {
  persistFavorite(timelineId: $timelineId) {
    savedObjectId
    version
    favorite {
      fullName
      userName
      favoriteDate
    }
  }
}
    `;
export type PersistTimelineFavoriteMutationMutationFn = ApolloReactCommon.MutationFunction<PersistTimelineFavoriteMutationMutation, PersistTimelineFavoriteMutationMutationVariables>;
export type PersistTimelineFavoriteMutationComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<PersistTimelineFavoriteMutationMutation, PersistTimelineFavoriteMutationMutationVariables>, 'mutation'>;

    export const PersistTimelineFavoriteMutationComponent = (props: PersistTimelineFavoriteMutationComponentProps) => (
      <ApolloReactComponents.Mutation<PersistTimelineFavoriteMutationMutation, PersistTimelineFavoriteMutationMutationVariables> mutation={PersistTimelineFavoriteMutationDocument} {...props} />
    );
    

/**
 * __usePersistTimelineFavoriteMutationMutation__
 *
 * To run a mutation, you first call `usePersistTimelineFavoriteMutationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePersistTimelineFavoriteMutationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [persistTimelineFavoriteMutationMutation, { data, loading, error }] = usePersistTimelineFavoriteMutationMutation({
 *   variables: {
 *      timelineId: // value for 'timelineId'
 *   },
 * });
 */
export function usePersistTimelineFavoriteMutationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PersistTimelineFavoriteMutationMutation, PersistTimelineFavoriteMutationMutationVariables>) {
        return ApolloReactHooks.useMutation<PersistTimelineFavoriteMutationMutation, PersistTimelineFavoriteMutationMutationVariables>(PersistTimelineFavoriteMutationDocument, baseOptions);
      }
export type PersistTimelineFavoriteMutationMutationHookResult = ReturnType<typeof usePersistTimelineFavoriteMutationMutation>;
export type PersistTimelineFavoriteMutationMutationResult = ApolloReactCommon.MutationResult<PersistTimelineFavoriteMutationMutation>;
export type PersistTimelineFavoriteMutationMutationOptions = ApolloReactCommon.BaseMutationOptions<PersistTimelineFavoriteMutationMutation, PersistTimelineFavoriteMutationMutationVariables>;
export const GetTimelineQueryDocument = gql`
    query GetTimelineQuery($sourceId: ID!, $fieldRequested: [String!]!, $pagination: PaginationInput!, $sortField: SortField!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    Timeline(fieldRequested: $fieldRequested, pagination: $pagination, sortField: $sortField, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      totalCount
      inspect @include(if: $inspect) {
        dsl
        response
      }
      pageInfo {
        endCursor {
          value
          tiebreaker
        }
        hasNextPage
      }
      edges {
        node {
          _id
          _index
          data {
            field
            value
          }
          ecs {
            _id
            _index
            timestamp
            message
            system {
              auth {
                ssh {
                  signature
                  method
                }
              }
              audit {
                package {
                  arch
                  entity_id
                  name
                  size
                  summary
                  version
                }
              }
            }
            event {
              action
              category
              code
              created
              dataset
              duration
              end
              hash
              id
              kind
              module
              original
              outcome
              risk_score
              risk_score_norm
              severity
              start
              timezone
              type
            }
            auditd {
              result
              session
              data {
                acct
                terminal
                op
              }
              summary {
                actor {
                  primary
                  secondary
                }
                object {
                  primary
                  secondary
                  type
                }
                how
                message_type
                sequence
              }
            }
            file {
              name
              path
              target_path
              extension
              type
              device
              inode
              uid
              owner
              gid
              group
              mode
              size
              mtime
              ctime
            }
            host {
              id
              name
              ip
            }
            source {
              bytes
              ip
              packets
              port
              geo {
                continent_name
                country_name
                country_iso_code
                city_name
                region_iso_code
                region_name
              }
            }
            destination {
              bytes
              ip
              packets
              port
              geo {
                continent_name
                country_name
                country_iso_code
                city_name
                region_iso_code
                region_name
              }
            }
            dns {
              question {
                name
                type
              }
              resolved_ip
              response_code
            }
            endgame {
              exit_code
              file_name
              file_path
              logon_type
              parent_process_name
              pid
              process_name
              subject_domain_name
              subject_logon_id
              subject_user_name
              target_domain_name
              target_logon_id
              target_user_name
            }
            geo {
              region_name
              country_iso_code
            }
            suricata {
              eve {
                proto
                flow_id
                alert {
                  signature
                  signature_id
                }
              }
            }
            network {
              bytes
              community_id
              direction
              packets
              protocol
              transport
            }
            http {
              version
              request {
                method
                body {
                  bytes
                  content
                }
                referrer
              }
              response {
                status_code
                body {
                  bytes
                  content
                }
              }
            }
            tls {
              client_certificate {
                fingerprint {
                  sha1
                }
              }
              fingerprints {
                ja3 {
                  hash
                }
              }
              server_certificate {
                fingerprint {
                  sha1
                }
              }
            }
            url {
              original
              domain
              username
              password
            }
            user {
              domain
              name
            }
            winlog {
              event_id
            }
            process {
              hash {
                md5
                sha1
                sha256
              }
              pid
              name
              ppid
              args
              executable
              title
              working_directory
            }
            zeek {
              session_id
              connection {
                local_resp
                local_orig
                missed_bytes
                state
                history
              }
              notice {
                suppress_for
                msg
                note
                sub
                dst
                dropped
                peer_descr
              }
              dns {
                AA
                qclass_name
                RD
                qtype_name
                rejected
                qtype
                query
                trans_id
                qclass
                RA
                TC
              }
              http {
                resp_mime_types
                trans_depth
                status_msg
                resp_fuids
                tags
              }
              files {
                session_ids
                timedout
                local_orig
                tx_host
                source
                is_orig
                overflow_bytes
                sha1
                duration
                depth
                analyzers
                mime_type
                rx_host
                total_bytes
                fuid
                seen_bytes
                missing_bytes
                md5
              }
              ssl {
                cipher
                established
                resumed
                version
              }
            }
          }
        }
      }
    }
  }
}
    `;
export type GetTimelineQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetTimelineQueryQuery, GetTimelineQueryQueryVariables>, 'query'> & ({ variables: GetTimelineQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetTimelineQueryComponent = (props: GetTimelineQueryComponentProps) => (
      <ApolloReactComponents.Query<GetTimelineQueryQuery, GetTimelineQueryQueryVariables> query={GetTimelineQueryDocument} {...props} />
    );
    

/**
 * __useGetTimelineQueryQuery__
 *
 * To run a query within a React component, call `useGetTimelineQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTimelineQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTimelineQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      fieldRequested: // value for 'fieldRequested'
 *      pagination: // value for 'pagination'
 *      sortField: // value for 'sortField'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetTimelineQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetTimelineQueryQuery, GetTimelineQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetTimelineQueryQuery, GetTimelineQueryQueryVariables>(GetTimelineQueryDocument, baseOptions);
      }
export function useGetTimelineQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTimelineQueryQuery, GetTimelineQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetTimelineQueryQuery, GetTimelineQueryQueryVariables>(GetTimelineQueryDocument, baseOptions);
        }
export type GetTimelineQueryQueryHookResult = ReturnType<typeof useGetTimelineQueryQuery>;
export type GetTimelineQueryLazyQueryHookResult = ReturnType<typeof useGetTimelineQueryLazyQuery>;
export type GetTimelineQueryQueryResult = ApolloReactCommon.QueryResult<GetTimelineQueryQuery, GetTimelineQueryQueryVariables>;
export const PersistTimelineNoteMutationDocument = gql`
    mutation PersistTimelineNoteMutation($noteId: ID, $version: String, $note: NoteInput!) {
  persistNote(noteId: $noteId, version: $version, note: $note) {
    code
    message
    note {
      eventId
      note
      timelineId
      timelineVersion
      noteId
      created
      createdBy
      updated
      updatedBy
      version
    }
  }
}
    `;
export type PersistTimelineNoteMutationMutationFn = ApolloReactCommon.MutationFunction<PersistTimelineNoteMutationMutation, PersistTimelineNoteMutationMutationVariables>;
export type PersistTimelineNoteMutationComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<PersistTimelineNoteMutationMutation, PersistTimelineNoteMutationMutationVariables>, 'mutation'>;

    export const PersistTimelineNoteMutationComponent = (props: PersistTimelineNoteMutationComponentProps) => (
      <ApolloReactComponents.Mutation<PersistTimelineNoteMutationMutation, PersistTimelineNoteMutationMutationVariables> mutation={PersistTimelineNoteMutationDocument} {...props} />
    );
    

/**
 * __usePersistTimelineNoteMutationMutation__
 *
 * To run a mutation, you first call `usePersistTimelineNoteMutationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePersistTimelineNoteMutationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [persistTimelineNoteMutationMutation, { data, loading, error }] = usePersistTimelineNoteMutationMutation({
 *   variables: {
 *      noteId: // value for 'noteId'
 *      version: // value for 'version'
 *      note: // value for 'note'
 *   },
 * });
 */
export function usePersistTimelineNoteMutationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PersistTimelineNoteMutationMutation, PersistTimelineNoteMutationMutationVariables>) {
        return ApolloReactHooks.useMutation<PersistTimelineNoteMutationMutation, PersistTimelineNoteMutationMutationVariables>(PersistTimelineNoteMutationDocument, baseOptions);
      }
export type PersistTimelineNoteMutationMutationHookResult = ReturnType<typeof usePersistTimelineNoteMutationMutation>;
export type PersistTimelineNoteMutationMutationResult = ApolloReactCommon.MutationResult<PersistTimelineNoteMutationMutation>;
export type PersistTimelineNoteMutationMutationOptions = ApolloReactCommon.BaseMutationOptions<PersistTimelineNoteMutationMutation, PersistTimelineNoteMutationMutationVariables>;
export const GetOneTimelineDocument = gql`
    query GetOneTimeline($id: ID!) {
  getOneTimeline(id: $id) {
    savedObjectId
    columns {
      aggregatable
      category
      columnHeaderType
      description
      example
      indexes
      id
      name
      searchable
      type
    }
    dataProviders {
      id
      name
      enabled
      excluded
      kqlQuery
      queryMatch {
        field
        displayField
        value
        displayValue
        operator
      }
      and {
        id
        name
        enabled
        excluded
        kqlQuery
        queryMatch {
          field
          displayField
          value
          displayValue
          operator
        }
      }
    }
    dateRange {
      start
      end
    }
    description
    eventIdToNoteIds {
      eventId
      note
      timelineId
      noteId
      created
      createdBy
      timelineVersion
      updated
      updatedBy
      version
    }
    favorite {
      fullName
      userName
      favoriteDate
    }
    filters {
      meta {
        alias
        controlledBy
        disabled
        field
        formattedValue
        index
        key
        negate
        params
        type
        value
      }
      query
      exists
      match_all
      missing
      range
      script
    }
    kqlMode
    kqlQuery {
      filterQuery {
        kuery {
          kind
          expression
        }
        serializedQuery
      }
    }
    notes {
      eventId
      note
      timelineId
      timelineVersion
      noteId
      created
      createdBy
      updated
      updatedBy
      version
    }
    noteIds
    pinnedEventIds
    pinnedEventsSaveObject {
      pinnedEventId
      eventId
      timelineId
      created
      createdBy
      updated
      updatedBy
      version
    }
    title
    savedQueryId
    sort {
      columnId
      sortDirection
    }
    created
    createdBy
    updated
    updatedBy
    version
  }
}
    `;
export type GetOneTimelineComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetOneTimelineQuery, GetOneTimelineQueryVariables>, 'query'> & ({ variables: GetOneTimelineQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetOneTimelineComponent = (props: GetOneTimelineComponentProps) => (
      <ApolloReactComponents.Query<GetOneTimelineQuery, GetOneTimelineQueryVariables> query={GetOneTimelineDocument} {...props} />
    );
    

/**
 * __useGetOneTimelineQuery__
 *
 * To run a query within a React component, call `useGetOneTimelineQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOneTimelineQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOneTimelineQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOneTimelineQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetOneTimelineQuery, GetOneTimelineQueryVariables>) {
        return ApolloReactHooks.useQuery<GetOneTimelineQuery, GetOneTimelineQueryVariables>(GetOneTimelineDocument, baseOptions);
      }
export function useGetOneTimelineLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetOneTimelineQuery, GetOneTimelineQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetOneTimelineQuery, GetOneTimelineQueryVariables>(GetOneTimelineDocument, baseOptions);
        }
export type GetOneTimelineQueryHookResult = ReturnType<typeof useGetOneTimelineQuery>;
export type GetOneTimelineLazyQueryHookResult = ReturnType<typeof useGetOneTimelineLazyQuery>;
export type GetOneTimelineQueryResult = ApolloReactCommon.QueryResult<GetOneTimelineQuery, GetOneTimelineQueryVariables>;
export const PersistTimelineMutationDocument = gql`
    mutation PersistTimelineMutation($timelineId: ID, $version: String, $timeline: TimelineInput!) {
  persistTimeline(id: $timelineId, version: $version, timeline: $timeline) {
    code
    message
    timeline {
      savedObjectId
      version
      columns {
        aggregatable
        category
        columnHeaderType
        description
        example
        indexes
        id
        name
        searchable
        type
      }
      dataProviders {
        id
        name
        enabled
        excluded
        kqlQuery
        queryMatch {
          field
          displayField
          value
          displayValue
          operator
        }
        and {
          id
          name
          enabled
          excluded
          kqlQuery
          queryMatch {
            field
            displayField
            value
            displayValue
            operator
          }
        }
      }
      description
      favorite {
        fullName
        userName
        favoriteDate
      }
      filters {
        meta {
          alias
          controlledBy
          disabled
          field
          formattedValue
          index
          key
          negate
          params
          type
          value
        }
        query
        exists
        match_all
        missing
        range
        script
      }
      kqlMode
      kqlQuery {
        filterQuery {
          kuery {
            kind
            expression
          }
          serializedQuery
        }
      }
      title
      dateRange {
        start
        end
      }
      savedQueryId
      sort {
        columnId
        sortDirection
      }
      created
      createdBy
      updated
      updatedBy
    }
  }
}
    `;
export type PersistTimelineMutationMutationFn = ApolloReactCommon.MutationFunction<PersistTimelineMutationMutation, PersistTimelineMutationMutationVariables>;
export type PersistTimelineMutationComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<PersistTimelineMutationMutation, PersistTimelineMutationMutationVariables>, 'mutation'>;

    export const PersistTimelineMutationComponent = (props: PersistTimelineMutationComponentProps) => (
      <ApolloReactComponents.Mutation<PersistTimelineMutationMutation, PersistTimelineMutationMutationVariables> mutation={PersistTimelineMutationDocument} {...props} />
    );
    

/**
 * __usePersistTimelineMutationMutation__
 *
 * To run a mutation, you first call `usePersistTimelineMutationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePersistTimelineMutationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [persistTimelineMutationMutation, { data, loading, error }] = usePersistTimelineMutationMutation({
 *   variables: {
 *      timelineId: // value for 'timelineId'
 *      version: // value for 'version'
 *      timeline: // value for 'timeline'
 *   },
 * });
 */
export function usePersistTimelineMutationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PersistTimelineMutationMutation, PersistTimelineMutationMutationVariables>) {
        return ApolloReactHooks.useMutation<PersistTimelineMutationMutation, PersistTimelineMutationMutationVariables>(PersistTimelineMutationDocument, baseOptions);
      }
export type PersistTimelineMutationMutationHookResult = ReturnType<typeof usePersistTimelineMutationMutation>;
export type PersistTimelineMutationMutationResult = ApolloReactCommon.MutationResult<PersistTimelineMutationMutation>;
export type PersistTimelineMutationMutationOptions = ApolloReactCommon.BaseMutationOptions<PersistTimelineMutationMutation, PersistTimelineMutationMutationVariables>;
export const PersistTimelinePinnedEventMutationDocument = gql`
    mutation PersistTimelinePinnedEventMutation($pinnedEventId: ID, $eventId: ID!, $timelineId: ID) {
  persistPinnedEventOnTimeline(pinnedEventId: $pinnedEventId, eventId: $eventId, timelineId: $timelineId) {
    pinnedEventId
    eventId
    timelineId
    timelineVersion
    created
    createdBy
    updated
    updatedBy
    version
  }
}
    `;
export type PersistTimelinePinnedEventMutationMutationFn = ApolloReactCommon.MutationFunction<PersistTimelinePinnedEventMutationMutation, PersistTimelinePinnedEventMutationMutationVariables>;
export type PersistTimelinePinnedEventMutationComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<PersistTimelinePinnedEventMutationMutation, PersistTimelinePinnedEventMutationMutationVariables>, 'mutation'>;

    export const PersistTimelinePinnedEventMutationComponent = (props: PersistTimelinePinnedEventMutationComponentProps) => (
      <ApolloReactComponents.Mutation<PersistTimelinePinnedEventMutationMutation, PersistTimelinePinnedEventMutationMutationVariables> mutation={PersistTimelinePinnedEventMutationDocument} {...props} />
    );
    

/**
 * __usePersistTimelinePinnedEventMutationMutation__
 *
 * To run a mutation, you first call `usePersistTimelinePinnedEventMutationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePersistTimelinePinnedEventMutationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [persistTimelinePinnedEventMutationMutation, { data, loading, error }] = usePersistTimelinePinnedEventMutationMutation({
 *   variables: {
 *      pinnedEventId: // value for 'pinnedEventId'
 *      eventId: // value for 'eventId'
 *      timelineId: // value for 'timelineId'
 *   },
 * });
 */
export function usePersistTimelinePinnedEventMutationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PersistTimelinePinnedEventMutationMutation, PersistTimelinePinnedEventMutationMutationVariables>) {
        return ApolloReactHooks.useMutation<PersistTimelinePinnedEventMutationMutation, PersistTimelinePinnedEventMutationMutationVariables>(PersistTimelinePinnedEventMutationDocument, baseOptions);
      }
export type PersistTimelinePinnedEventMutationMutationHookResult = ReturnType<typeof usePersistTimelinePinnedEventMutationMutation>;
export type PersistTimelinePinnedEventMutationMutationResult = ApolloReactCommon.MutationResult<PersistTimelinePinnedEventMutationMutation>;
export type PersistTimelinePinnedEventMutationMutationOptions = ApolloReactCommon.BaseMutationOptions<PersistTimelinePinnedEventMutationMutation, PersistTimelinePinnedEventMutationMutationVariables>;
export const GetTlsQueryDocument = gql`
    query GetTlsQuery($sourceId: ID!, $filterQuery: String, $flowTarget: FlowTargetSourceDest!, $ip: String!, $pagination: PaginationInputPaginated!, $sort: TlsSortField!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    Tls(filterQuery: $filterQuery, flowTarget: $flowTarget, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          _id
          alternativeNames
          commonNames
          ja3
          issuerNames
          notAfter
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetTlsQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetTlsQueryQuery, GetTlsQueryQueryVariables>, 'query'> & ({ variables: GetTlsQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetTlsQueryComponent = (props: GetTlsQueryComponentProps) => (
      <ApolloReactComponents.Query<GetTlsQueryQuery, GetTlsQueryQueryVariables> query={GetTlsQueryDocument} {...props} />
    );
    

/**
 * __useGetTlsQueryQuery__
 *
 * To run a query within a React component, call `useGetTlsQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTlsQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTlsQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      filterQuery: // value for 'filterQuery'
 *      flowTarget: // value for 'flowTarget'
 *      ip: // value for 'ip'
 *      pagination: // value for 'pagination'
 *      sort: // value for 'sort'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetTlsQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetTlsQueryQuery, GetTlsQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetTlsQueryQuery, GetTlsQueryQueryVariables>(GetTlsQueryDocument, baseOptions);
      }
export function useGetTlsQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTlsQueryQuery, GetTlsQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetTlsQueryQuery, GetTlsQueryQueryVariables>(GetTlsQueryDocument, baseOptions);
        }
export type GetTlsQueryQueryHookResult = ReturnType<typeof useGetTlsQueryQuery>;
export type GetTlsQueryLazyQueryHookResult = ReturnType<typeof useGetTlsQueryLazyQuery>;
export type GetTlsQueryQueryResult = ApolloReactCommon.QueryResult<GetTlsQueryQuery, GetTlsQueryQueryVariables>;
export const GetUncommonProcessesQueryDocument = gql`
    query GetUncommonProcessesQuery($sourceId: ID!, $timerange: TimerangeInput!, $pagination: PaginationInputPaginated!, $filterQuery: String, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    UncommonProcesses(timerange: $timerange, pagination: $pagination, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          _id
          instances
          process {
            args
            name
          }
          user {
            id
            name
          }
          hosts {
            name
          }
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetUncommonProcessesQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables>, 'query'> & ({ variables: GetUncommonProcessesQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetUncommonProcessesQueryComponent = (props: GetUncommonProcessesQueryComponentProps) => (
      <ApolloReactComponents.Query<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables> query={GetUncommonProcessesQueryDocument} {...props} />
    );
    

/**
 * __useGetUncommonProcessesQueryQuery__
 *
 * To run a query within a React component, call `useGetUncommonProcessesQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUncommonProcessesQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUncommonProcessesQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      timerange: // value for 'timerange'
 *      pagination: // value for 'pagination'
 *      filterQuery: // value for 'filterQuery'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetUncommonProcessesQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables>(GetUncommonProcessesQueryDocument, baseOptions);
      }
export function useGetUncommonProcessesQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables>(GetUncommonProcessesQueryDocument, baseOptions);
        }
export type GetUncommonProcessesQueryQueryHookResult = ReturnType<typeof useGetUncommonProcessesQueryQuery>;
export type GetUncommonProcessesQueryLazyQueryHookResult = ReturnType<typeof useGetUncommonProcessesQueryLazyQuery>;
export type GetUncommonProcessesQueryQueryResult = ApolloReactCommon.QueryResult<GetUncommonProcessesQueryQuery, GetUncommonProcessesQueryQueryVariables>;
export const GetUsersQueryDocument = gql`
    query GetUsersQuery($sourceId: ID!, $filterQuery: String, $flowTarget: FlowTarget!, $ip: String!, $pagination: PaginationInputPaginated!, $sort: UsersSortField!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {
  source(id: $sourceId) {
    id
    Users(filterQuery: $filterQuery, flowTarget: $flowTarget, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {
      totalCount
      edges {
        node {
          user {
            name
            id
            groupId
            groupName
            count
          }
        }
        cursor {
          value
        }
      }
      pageInfo {
        activePage
        fakeTotalCount
        showMorePagesIndicator
      }
      inspect @include(if: $inspect) {
        dsl
        response
      }
    }
  }
}
    `;
export type GetUsersQueryComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetUsersQueryQuery, GetUsersQueryQueryVariables>, 'query'> & ({ variables: GetUsersQueryQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const GetUsersQueryComponent = (props: GetUsersQueryComponentProps) => (
      <ApolloReactComponents.Query<GetUsersQueryQuery, GetUsersQueryQueryVariables> query={GetUsersQueryDocument} {...props} />
    );
    

/**
 * __useGetUsersQueryQuery__
 *
 * To run a query within a React component, call `useGetUsersQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUsersQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUsersQueryQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      filterQuery: // value for 'filterQuery'
 *      flowTarget: // value for 'flowTarget'
 *      ip: // value for 'ip'
 *      pagination: // value for 'pagination'
 *      sort: // value for 'sort'
 *      timerange: // value for 'timerange'
 *      defaultIndex: // value for 'defaultIndex'
 *      inspect: // value for 'inspect'
 *   },
 * });
 */
export function useGetUsersQueryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetUsersQueryQuery, GetUsersQueryQueryVariables>) {
        return ApolloReactHooks.useQuery<GetUsersQueryQuery, GetUsersQueryQueryVariables>(GetUsersQueryDocument, baseOptions);
      }
export function useGetUsersQueryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetUsersQueryQuery, GetUsersQueryQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GetUsersQueryQuery, GetUsersQueryQueryVariables>(GetUsersQueryDocument, baseOptions);
        }
export type GetUsersQueryQueryHookResult = ReturnType<typeof useGetUsersQueryQuery>;
export type GetUsersQueryLazyQueryHookResult = ReturnType<typeof useGetUsersQueryLazyQuery>;
export type GetUsersQueryQueryResult = ApolloReactCommon.QueryResult<GetUsersQueryQuery, GetUsersQueryQueryVariables>;
export namespace GetAlertsOverTimeQuery {
  export type Variables = GetAlertsOverTimeQueryQueryVariables;
  export type Query = GetAlertsOverTimeQueryQuery;
  export type Source = GetAlertsOverTimeQueryQuery['source'];
  export type AlertsHistogram = GetAlertsOverTimeQueryQuery['source']['AlertsHistogram'];
  export type AlertsOverTimeByModule = (NonNullable<GetAlertsOverTimeQueryQuery['source']['AlertsHistogram']['alertsOverTimeByModule'][0]>);
  export type Inspect = (NonNullable<GetAlertsOverTimeQueryQuery['source']['AlertsHistogram']['inspect']>);
  export const Document = GetAlertsOverTimeQueryDocument;
  export const Component = GetAlertsOverTimeQueryComponent;
  export const use = useGetAlertsOverTimeQueryQuery;
}

export namespace GetAnomaliesOverTimeQuery {
  export type Variables = GetAnomaliesOverTimeQueryQueryVariables;
  export type Query = GetAnomaliesOverTimeQueryQuery;
  export type Source = GetAnomaliesOverTimeQueryQuery['source'];
  export type AnomaliesOverTime = GetAnomaliesOverTimeQueryQuery['source']['AnomaliesOverTime'];
  export type _AnomaliesOverTime = (NonNullable<GetAnomaliesOverTimeQueryQuery['source']['AnomaliesOverTime']['anomaliesOverTime'][0]>);
  export type Inspect = (NonNullable<GetAnomaliesOverTimeQueryQuery['source']['AnomaliesOverTime']['inspect']>);
  export const Document = GetAnomaliesOverTimeQueryDocument;
  export const Component = GetAnomaliesOverTimeQueryComponent;
  export const use = useGetAnomaliesOverTimeQueryQuery;
}

export namespace GetAuthenticationsOverTimeQuery {
  export type Variables = GetAuthenticationsOverTimeQueryQueryVariables;
  export type Query = GetAuthenticationsOverTimeQueryQuery;
  export type Source = GetAuthenticationsOverTimeQueryQuery['source'];
  export type AuthenticationsOverTime = GetAuthenticationsOverTimeQueryQuery['source']['AuthenticationsOverTime'];
  export type _AuthenticationsOverTime = (NonNullable<GetAuthenticationsOverTimeQueryQuery['source']['AuthenticationsOverTime']['authenticationsOverTime'][0]>);
  export type Inspect = (NonNullable<GetAuthenticationsOverTimeQueryQuery['source']['AuthenticationsOverTime']['inspect']>);
  export const Document = GetAuthenticationsOverTimeQueryDocument;
  export const Component = GetAuthenticationsOverTimeQueryComponent;
  export const use = useGetAuthenticationsOverTimeQueryQuery;
}

export namespace GetAuthenticationsQuery {
  export type Variables = GetAuthenticationsQueryQueryVariables;
  export type Query = GetAuthenticationsQueryQuery;
  export type Source = GetAuthenticationsQueryQuery['source'];
  export type Authentications = GetAuthenticationsQueryQuery['source']['Authentications'];
  export type Edges = (NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>);
  export type Node = (NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node'];
  export type User = (NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['user'];
  export type LastSuccess = (NonNullable<(NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['lastSuccess']>);
  export type _Source = (NonNullable<(NonNullable<(NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['lastSuccess']>)['source']>);
  export type Host = (NonNullable<(NonNullable<(NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['lastSuccess']>)['host']>);
  export type LastFailure = (NonNullable<(NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['lastFailure']>);
  export type __Source = (NonNullable<(NonNullable<(NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['lastFailure']>)['source']>);
  export type _Host = (NonNullable<(NonNullable<(NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['node']['lastFailure']>)['host']>);
  export type Cursor = (NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['edges'][0]>)['cursor'];
  export type PageInfo = GetAuthenticationsQueryQuery['source']['Authentications']['pageInfo'];
  export type Inspect = (NonNullable<GetAuthenticationsQueryQuery['source']['Authentications']['inspect']>);
  export const Document = GetAuthenticationsQueryDocument;
  export const Component = GetAuthenticationsQueryComponent;
  export const use = useGetAuthenticationsQueryQuery;
}

export namespace GetEventsOverTimeQuery {
  export type Variables = GetEventsOverTimeQueryQueryVariables;
  export type Query = GetEventsOverTimeQueryQuery;
  export type Source = GetEventsOverTimeQueryQuery['source'];
  export type EventsOverTime = GetEventsOverTimeQueryQuery['source']['EventsOverTime'];
  export type _EventsOverTime = (NonNullable<GetEventsOverTimeQueryQuery['source']['EventsOverTime']['eventsOverTime'][0]>);
  export type Inspect = (NonNullable<GetEventsOverTimeQueryQuery['source']['EventsOverTime']['inspect']>);
  export const Document = GetEventsOverTimeQueryDocument;
  export const Component = GetEventsOverTimeQueryComponent;
  export const use = useGetEventsOverTimeQueryQuery;
}

export namespace GetLastEventTimeQuery {
  export type Variables = GetLastEventTimeQueryQueryVariables;
  export type Query = GetLastEventTimeQueryQuery;
  export type Source = GetLastEventTimeQueryQuery['source'];
  export type LastEventTime = GetLastEventTimeQueryQuery['source']['LastEventTime'];
  export const Document = GetLastEventTimeQueryDocument;
  export const Component = GetLastEventTimeQueryComponent;
  export const use = useGetLastEventTimeQueryQuery;
}

export namespace GetHostFirstLastSeenQuery {
  export type Variables = GetHostFirstLastSeenQueryQueryVariables;
  export type Query = GetHostFirstLastSeenQueryQuery;
  export type Source = GetHostFirstLastSeenQueryQuery['source'];
  export type HostFirstLastSeen = GetHostFirstLastSeenQueryQuery['source']['HostFirstLastSeen'];
  export const Document = GetHostFirstLastSeenQueryDocument;
  export const Component = GetHostFirstLastSeenQueryComponent;
  export const use = useGetHostFirstLastSeenQueryQuery;
}

export namespace GetHostsTableQuery {
  export type Variables = GetHostsTableQueryQueryVariables;
  export type Query = GetHostsTableQueryQuery;
  export type Source = GetHostsTableQueryQuery['source'];
  export type Hosts = GetHostsTableQueryQuery['source']['Hosts'];
  export type Edges = (NonNullable<GetHostsTableQueryQuery['source']['Hosts']['edges'][0]>);
  export type Node = (NonNullable<GetHostsTableQueryQuery['source']['Hosts']['edges'][0]>)['node'];
  export type Host = (NonNullable<(NonNullable<GetHostsTableQueryQuery['source']['Hosts']['edges'][0]>)['node']['host']>);
  export type Os = (NonNullable<(NonNullable<(NonNullable<GetHostsTableQueryQuery['source']['Hosts']['edges'][0]>)['node']['host']>)['os']>);
  export type Cursor = (NonNullable<GetHostsTableQueryQuery['source']['Hosts']['edges'][0]>)['cursor'];
  export type PageInfo = GetHostsTableQueryQuery['source']['Hosts']['pageInfo'];
  export type Inspect = (NonNullable<GetHostsTableQueryQuery['source']['Hosts']['inspect']>);
  export const Document = GetHostsTableQueryDocument;
  export const Component = GetHostsTableQueryComponent;
  export const use = useGetHostsTableQueryQuery;
}

export namespace GetHostOverviewQuery {
  export type Variables = GetHostOverviewQueryQueryVariables;
  export type Query = GetHostOverviewQueryQuery;
  export type Source = GetHostOverviewQueryQuery['source'];
  export type HostOverview = GetHostOverviewQueryQuery['source']['HostOverview'];
  export type Host = (NonNullable<GetHostOverviewQueryQuery['source']['HostOverview']['host']>);
  export type Os = (NonNullable<(NonNullable<GetHostOverviewQueryQuery['source']['HostOverview']['host']>)['os']>);
  export type Cloud = (NonNullable<GetHostOverviewQueryQuery['source']['HostOverview']['cloud']>);
  export type Instance = (NonNullable<(NonNullable<GetHostOverviewQueryQuery['source']['HostOverview']['cloud']>)['instance']>);
  export type Machine = (NonNullable<(NonNullable<GetHostOverviewQueryQuery['source']['HostOverview']['cloud']>)['machine']>);
  export type Inspect = (NonNullable<GetHostOverviewQueryQuery['source']['HostOverview']['inspect']>);
  export const Document = GetHostOverviewQueryDocument;
  export const Component = GetHostOverviewQueryComponent;
  export const use = useGetHostOverviewQueryQuery;
}

export namespace GetIpOverviewQuery {
  export type Variables = GetIpOverviewQueryQueryVariables;
  export type Query = GetIpOverviewQueryQuery;
  export type Source = GetIpOverviewQueryQuery['source'];
  export type IpOverview = (NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>);
  export type _Source = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['source']>);
  export type AutonomousSystem = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['source']>)['autonomousSystem'];
  export type Organization = (NonNullable<(NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['source']>)['autonomousSystem']['organization']>);
  export type Geo = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['source']>)['geo'];
  export type Location = (NonNullable<(NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['source']>)['geo']['location']>);
  export type Destination = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['destination']>);
  export type _AutonomousSystem = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['destination']>)['autonomousSystem'];
  export type _Organization = (NonNullable<(NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['destination']>)['autonomousSystem']['organization']>);
  export type _Geo = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['destination']>)['geo'];
  export type _Location = (NonNullable<(NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['destination']>)['geo']['location']>);
  export type Host = (NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['host'];
  export type Os = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['host']['os']>);
  export type Inspect = (NonNullable<(NonNullable<GetIpOverviewQueryQuery['source']['IpOverview']>)['inspect']>);
  export const Document = GetIpOverviewQueryDocument;
  export const Component = GetIpOverviewQueryComponent;
  export const use = useGetIpOverviewQueryQuery;
}

export namespace KpiHostDetailsChartFields {
  export type Fragment = KpiHostDetailsChartFieldsFragment;
}

export namespace GetKpiHostDetailsQuery {
  export type Variables = GetKpiHostDetailsQueryQueryVariables;
  export type Query = GetKpiHostDetailsQueryQuery;
  export type Source = GetKpiHostDetailsQueryQuery['source'];
  export type KpiHostDetails = GetKpiHostDetailsQueryQuery['source']['KpiHostDetails'];
  export type AuthSuccessHistogram = KpiHostDetailsChartFieldsFragment;
  export type AuthFailureHistogram = KpiHostDetailsChartFieldsFragment;
  export type UniqueSourceIpsHistogram = KpiHostDetailsChartFieldsFragment;
  export type UniqueDestinationIpsHistogram = KpiHostDetailsChartFieldsFragment;
  export type Inspect = (NonNullable<GetKpiHostDetailsQueryQuery['source']['KpiHostDetails']['inspect']>);
  export const Document = GetKpiHostDetailsQueryDocument;
  export const Component = GetKpiHostDetailsQueryComponent;
  export const use = useGetKpiHostDetailsQueryQuery;
}

export namespace KpiHostChartFields {
  export type Fragment = KpiHostChartFieldsFragment;
}

export namespace GetKpiHostsQuery {
  export type Variables = GetKpiHostsQueryQueryVariables;
  export type Query = GetKpiHostsQueryQuery;
  export type Source = GetKpiHostsQueryQuery['source'];
  export type KpiHosts = GetKpiHostsQueryQuery['source']['KpiHosts'];
  export type HostsHistogram = KpiHostChartFieldsFragment;
  export type AuthSuccessHistogram = KpiHostChartFieldsFragment;
  export type AuthFailureHistogram = KpiHostChartFieldsFragment;
  export type UniqueSourceIpsHistogram = KpiHostChartFieldsFragment;
  export type UniqueDestinationIpsHistogram = KpiHostChartFieldsFragment;
  export type Inspect = (NonNullable<GetKpiHostsQueryQuery['source']['KpiHosts']['inspect']>);
  export const Document = GetKpiHostsQueryDocument;
  export const Component = GetKpiHostsQueryComponent;
  export const use = useGetKpiHostsQueryQuery;
}

export namespace KpiNetworkChartFields {
  export type Fragment = KpiNetworkChartFieldsFragment;
}

export namespace GetKpiNetworkQuery {
  export type Variables = GetKpiNetworkQueryQueryVariables;
  export type Query = GetKpiNetworkQueryQuery;
  export type Source = GetKpiNetworkQueryQuery['source'];
  export type KpiNetwork = (NonNullable<GetKpiNetworkQueryQuery['source']['KpiNetwork']>);
  export type UniqueSourcePrivateIpsHistogram = KpiNetworkChartFieldsFragment;
  export type UniqueDestinationPrivateIpsHistogram = KpiNetworkChartFieldsFragment;
  export type Inspect = (NonNullable<(NonNullable<GetKpiNetworkQueryQuery['source']['KpiNetwork']>)['inspect']>);
  export const Document = GetKpiNetworkQueryDocument;
  export const Component = GetKpiNetworkQueryComponent;
  export const use = useGetKpiNetworkQueryQuery;
}

export namespace GetNetworkDnsQuery {
  export type Variables = GetNetworkDnsQueryQueryVariables;
  export type Query = GetNetworkDnsQueryQuery;
  export type Source = GetNetworkDnsQueryQuery['source'];
  export type NetworkDns = GetNetworkDnsQueryQuery['source']['NetworkDns'];
  export type Edges = (NonNullable<GetNetworkDnsQueryQuery['source']['NetworkDns']['edges'][0]>);
  export type Node = (NonNullable<GetNetworkDnsQueryQuery['source']['NetworkDns']['edges'][0]>)['node'];
  export type Cursor = (NonNullable<GetNetworkDnsQueryQuery['source']['NetworkDns']['edges'][0]>)['cursor'];
  export type PageInfo = GetNetworkDnsQueryQuery['source']['NetworkDns']['pageInfo'];
  export type Inspect = (NonNullable<GetNetworkDnsQueryQuery['source']['NetworkDns']['inspect']>);
  export type Histogram = (NonNullable<(NonNullable<GetNetworkDnsQueryQuery['source']['NetworkDns']['histogram']>)[0]>);
  export const Document = GetNetworkDnsQueryDocument;
  export const Component = GetNetworkDnsQueryComponent;
  export const use = useGetNetworkDnsQueryQuery;
}

export namespace GetNetworkHttpQuery {
  export type Variables = GetNetworkHttpQueryQueryVariables;
  export type Query = GetNetworkHttpQueryQuery;
  export type Source = GetNetworkHttpQueryQuery['source'];
  export type NetworkHttp = GetNetworkHttpQueryQuery['source']['NetworkHttp'];
  export type Edges = (NonNullable<GetNetworkHttpQueryQuery['source']['NetworkHttp']['edges'][0]>);
  export type Node = (NonNullable<GetNetworkHttpQueryQuery['source']['NetworkHttp']['edges'][0]>)['node'];
  export type Cursor = (NonNullable<GetNetworkHttpQueryQuery['source']['NetworkHttp']['edges'][0]>)['cursor'];
  export type PageInfo = GetNetworkHttpQueryQuery['source']['NetworkHttp']['pageInfo'];
  export type Inspect = (NonNullable<GetNetworkHttpQueryQuery['source']['NetworkHttp']['inspect']>);
  export const Document = GetNetworkHttpQueryDocument;
  export const Component = GetNetworkHttpQueryComponent;
  export const use = useGetNetworkHttpQueryQuery;
}

export namespace GetNetworkTopCountriesQuery {
  export type Variables = GetNetworkTopCountriesQueryQueryVariables;
  export type Query = GetNetworkTopCountriesQueryQuery;
  export type Source = GetNetworkTopCountriesQueryQuery['source'];
  export type NetworkTopCountries = GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries'];
  export type Edges = (NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['edges'][0]>);
  export type Node = (NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['edges'][0]>)['node'];
  export type _Source = (NonNullable<(NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['edges'][0]>)['node']['source']>);
  export type Destination = (NonNullable<(NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['edges'][0]>)['node']['destination']>);
  export type Network = (NonNullable<(NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['edges'][0]>)['node']['network']>);
  export type Cursor = (NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['edges'][0]>)['cursor'];
  export type PageInfo = GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['pageInfo'];
  export type Inspect = (NonNullable<GetNetworkTopCountriesQueryQuery['source']['NetworkTopCountries']['inspect']>);
  export const Document = GetNetworkTopCountriesQueryDocument;
  export const Component = GetNetworkTopCountriesQueryComponent;
  export const use = useGetNetworkTopCountriesQueryQuery;
}

export namespace GetNetworkTopNFlowQuery {
  export type Variables = GetNetworkTopNFlowQueryQueryVariables;
  export type Query = GetNetworkTopNFlowQueryQuery;
  export type Source = GetNetworkTopNFlowQueryQuery['source'];
  export type NetworkTopNFlow = GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow'];
  export type Edges = (NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>);
  export type Node = (NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node'];
  export type _Source = (NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['source']>);
  export type AutonomousSystem = (NonNullable<(NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['source']>)['autonomous_system']>);
  export type Location = (NonNullable<(NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['source']>)['location']>);
  export type Geo = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['source']>)['location']>)['geo']>);
  export type Destination = (NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['destination']>);
  export type _AutonomousSystem = (NonNullable<(NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['destination']>)['autonomous_system']>);
  export type _Location = (NonNullable<(NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['destination']>)['location']>);
  export type _Geo = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['destination']>)['location']>)['geo']>);
  export type Network = (NonNullable<(NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['node']['network']>);
  export type Cursor = (NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['edges'][0]>)['cursor'];
  export type PageInfo = GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['pageInfo'];
  export type Inspect = (NonNullable<GetNetworkTopNFlowQueryQuery['source']['NetworkTopNFlow']['inspect']>);
  export const Document = GetNetworkTopNFlowQueryDocument;
  export const Component = GetNetworkTopNFlowQueryComponent;
  export const use = useGetNetworkTopNFlowQueryQuery;
}

export namespace GetOverviewHostQuery {
  export type Variables = GetOverviewHostQueryQueryVariables;
  export type Query = GetOverviewHostQueryQuery;
  export type Source = GetOverviewHostQueryQuery['source'];
  export type OverviewHost = (NonNullable<GetOverviewHostQueryQuery['source']['OverviewHost']>);
  export type Inspect = (NonNullable<(NonNullable<GetOverviewHostQueryQuery['source']['OverviewHost']>)['inspect']>);
  export const Document = GetOverviewHostQueryDocument;
  export const Component = GetOverviewHostQueryComponent;
  export const use = useGetOverviewHostQueryQuery;
}

export namespace GetOverviewNetworkQuery {
  export type Variables = GetOverviewNetworkQueryQueryVariables;
  export type Query = GetOverviewNetworkQueryQuery;
  export type Source = GetOverviewNetworkQueryQuery['source'];
  export type OverviewNetwork = (NonNullable<GetOverviewNetworkQueryQuery['source']['OverviewNetwork']>);
  export type Inspect = (NonNullable<(NonNullable<GetOverviewNetworkQueryQuery['source']['OverviewNetwork']>)['inspect']>);
  export const Document = GetOverviewNetworkQueryDocument;
  export const Component = GetOverviewNetworkQueryComponent;
  export const use = useGetOverviewNetworkQueryQuery;
}

export namespace SourceQuery {
  export type Variables = SourceQueryQueryVariables;
  export type Query = SourceQueryQuery;
  export type Source = SourceQueryQuery['source'];
  export type Status = SourceQueryQuery['source']['status'];
  export type IndexFields = (NonNullable<SourceQueryQuery['source']['status']['indexFields'][0]>);
  export const Document = SourceQueryDocument;
  export const Component = SourceQueryComponent;
  export const use = useSourceQueryQuery;
}

export namespace GetAllTimeline {
  export type Variables = GetAllTimelineQueryVariables;
  export type Query = GetAllTimelineQuery;
  export type GetAllTimeline = GetAllTimelineQuery['getAllTimeline'];
  export type Timeline = (NonNullable<GetAllTimelineQuery['getAllTimeline']['timeline'][0]>);
  export type Favorite = (NonNullable<(NonNullable<(NonNullable<GetAllTimelineQuery['getAllTimeline']['timeline'][0]>)['favorite']>)[0]>);
  export type EventIdToNoteIds = (NonNullable<(NonNullable<(NonNullable<GetAllTimelineQuery['getAllTimeline']['timeline'][0]>)['eventIdToNoteIds']>)[0]>);
  export type Notes = (NonNullable<(NonNullable<(NonNullable<GetAllTimelineQuery['getAllTimeline']['timeline'][0]>)['notes']>)[0]>);
  export const Document = GetAllTimelineDocument;
  export const Component = GetAllTimelineComponent;
  export const use = useGetAllTimelineQuery;
}

export namespace DeleteTimelineMutation {
  export type Variables = DeleteTimelineMutationMutationVariables;
  export type Mutation = DeleteTimelineMutationMutation;
  export const Document = DeleteTimelineMutationDocument;
  export const Component = DeleteTimelineMutationComponent;
  export const use = useDeleteTimelineMutationMutation;
}

export namespace GetTimelineDetailsQuery {
  export type Variables = GetTimelineDetailsQueryQueryVariables;
  export type Query = GetTimelineDetailsQueryQuery;
  export type Source = GetTimelineDetailsQueryQuery['source'];
  export type TimelineDetails = GetTimelineDetailsQueryQuery['source']['TimelineDetails'];
  export type Data = (NonNullable<(NonNullable<GetTimelineDetailsQueryQuery['source']['TimelineDetails']['data']>)[0]>);
  export const Document = GetTimelineDetailsQueryDocument;
  export const Component = GetTimelineDetailsQueryComponent;
  export const use = useGetTimelineDetailsQueryQuery;
}

export namespace PersistTimelineFavoriteMutation {
  export type Variables = PersistTimelineFavoriteMutationMutationVariables;
  export type Mutation = PersistTimelineFavoriteMutationMutation;
  export type PersistFavorite = PersistTimelineFavoriteMutationMutation['persistFavorite'];
  export type Favorite = (NonNullable<(NonNullable<PersistTimelineFavoriteMutationMutation['persistFavorite']['favorite']>)[0]>);
  export const Document = PersistTimelineFavoriteMutationDocument;
  export const Component = PersistTimelineFavoriteMutationComponent;
  export const use = usePersistTimelineFavoriteMutationMutation;
}

export namespace GetTimelineQuery {
  export type Variables = GetTimelineQueryQueryVariables;
  export type Query = GetTimelineQueryQuery;
  export type Source = GetTimelineQueryQuery['source'];
  export type Timeline = GetTimelineQueryQuery['source']['Timeline'];
  export type Inspect = (NonNullable<GetTimelineQueryQuery['source']['Timeline']['inspect']>);
  export type PageInfo = GetTimelineQueryQuery['source']['Timeline']['pageInfo'];
  export type EndCursor = (NonNullable<GetTimelineQueryQuery['source']['Timeline']['pageInfo']['endCursor']>);
  export type Edges = (NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>);
  export type Node = (NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node'];
  export type Data = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['data'][0]>);
  export type Ecs = (NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs'];
  export type System = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['system']>);
  export type Auth = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['system']>)['auth']>);
  export type Ssh = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['system']>)['auth']>)['ssh']>);
  export type Audit = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['system']>)['audit']>);
  export type Package = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['system']>)['audit']>)['package']>);
  export type Event = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['event']>);
  export type Auditd = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['auditd']>);
  export type _Data = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['auditd']>)['data']>);
  export type Summary = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['auditd']>)['summary']>);
  export type Actor = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['auditd']>)['summary']>)['actor']>);
  export type Object = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['auditd']>)['summary']>)['object']>);
  export type File = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['file']>);
  export type Host = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['host']>);
  export type _Source = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['source']>);
  export type Geo = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['source']>)['geo']>);
  export type Destination = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['destination']>);
  export type _Geo = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['destination']>)['geo']>);
  export type Dns = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['dns']>);
  export type Question = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['dns']>)['question']>);
  export type Endgame = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['endgame']>);
  export type __Geo = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['geo']>);
  export type Suricata = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['suricata']>);
  export type Eve = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['suricata']>)['eve']>);
  export type Alert = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['suricata']>)['eve']>)['alert']>);
  export type Network = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['network']>);
  export type Http = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['http']>);
  export type Request = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['http']>)['request']>);
  export type Body = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['http']>)['request']>)['body']>);
  export type Response = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['http']>)['response']>);
  export type _Body = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['http']>)['response']>)['body']>);
  export type Tls = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>);
  export type ClientCertificate = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>)['client_certificate']>);
  export type Fingerprint = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>)['client_certificate']>)['fingerprint']>);
  export type Fingerprints = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>)['fingerprints']>);
  export type Ja3 = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>)['fingerprints']>)['ja3']>);
  export type ServerCertificate = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>)['server_certificate']>);
  export type _Fingerprint = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['tls']>)['server_certificate']>)['fingerprint']>);
  export type Url = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['url']>);
  export type User = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['user']>);
  export type Winlog = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['winlog']>);
  export type Process = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['process']>);
  export type Hash = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['process']>)['hash']>);
  export type Zeek = (NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>);
  export type Connection = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>)['connection']>);
  export type Notice = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>)['notice']>);
  export type _Dns = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>)['dns']>);
  export type _Http = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>)['http']>);
  export type Files = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>)['files']>);
  export type Ssl = (NonNullable<(NonNullable<(NonNullable<GetTimelineQueryQuery['source']['Timeline']['edges'][0]>)['node']['ecs']['zeek']>)['ssl']>);
  export const Document = GetTimelineQueryDocument;
  export const Component = GetTimelineQueryComponent;
  export const use = useGetTimelineQueryQuery;
}

export namespace PersistTimelineNoteMutation {
  export type Variables = PersistTimelineNoteMutationMutationVariables;
  export type Mutation = PersistTimelineNoteMutationMutation;
  export type PersistNote = PersistTimelineNoteMutationMutation['persistNote'];
  export type Note = PersistTimelineNoteMutationMutation['persistNote']['note'];
  export const Document = PersistTimelineNoteMutationDocument;
  export const Component = PersistTimelineNoteMutationComponent;
  export const use = usePersistTimelineNoteMutationMutation;
}

export namespace GetOneTimeline {
  export type Variables = GetOneTimelineQueryVariables;
  export type Query = GetOneTimelineQuery;
  export type GetOneTimeline = GetOneTimelineQuery['getOneTimeline'];
  export type Columns = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['columns']>)[0]>);
  export type DataProviders = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['dataProviders']>)[0]>);
  export type QueryMatch = (NonNullable<(NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['dataProviders']>)[0]>)['queryMatch']>);
  export type And = (NonNullable<(NonNullable<(NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['dataProviders']>)[0]>)['and']>)[0]>);
  export type _QueryMatch = (NonNullable<(NonNullable<(NonNullable<(NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['dataProviders']>)[0]>)['and']>)[0]>)['queryMatch']>);
  export type DateRange = (NonNullable<GetOneTimelineQuery['getOneTimeline']['dateRange']>);
  export type EventIdToNoteIds = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['eventIdToNoteIds']>)[0]>);
  export type Favorite = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['favorite']>)[0]>);
  export type Filters = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['filters']>)[0]>);
  export type Meta = (NonNullable<(NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['filters']>)[0]>)['meta']>);
  export type KqlQuery = (NonNullable<GetOneTimelineQuery['getOneTimeline']['kqlQuery']>);
  export type FilterQuery = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['kqlQuery']>)['filterQuery']>);
  export type Kuery = (NonNullable<(NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['kqlQuery']>)['filterQuery']>)['kuery']>);
  export type Notes = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['notes']>)[0]>);
  export type PinnedEventsSaveObject = (NonNullable<(NonNullable<GetOneTimelineQuery['getOneTimeline']['pinnedEventsSaveObject']>)[0]>);
  export type Sort = (NonNullable<GetOneTimelineQuery['getOneTimeline']['sort']>);
  export const Document = GetOneTimelineDocument;
  export const Component = GetOneTimelineComponent;
  export const use = useGetOneTimelineQuery;
}

export namespace PersistTimelineMutation {
  export type Variables = PersistTimelineMutationMutationVariables;
  export type Mutation = PersistTimelineMutationMutation;
  export type PersistTimeline = PersistTimelineMutationMutation['persistTimeline'];
  export type Timeline = PersistTimelineMutationMutation['persistTimeline']['timeline'];
  export type Columns = (NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['columns']>)[0]>);
  export type DataProviders = (NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['dataProviders']>)[0]>);
  export type QueryMatch = (NonNullable<(NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['dataProviders']>)[0]>)['queryMatch']>);
  export type And = (NonNullable<(NonNullable<(NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['dataProviders']>)[0]>)['and']>)[0]>);
  export type _QueryMatch = (NonNullable<(NonNullable<(NonNullable<(NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['dataProviders']>)[0]>)['and']>)[0]>)['queryMatch']>);
  export type Favorite = (NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['favorite']>)[0]>);
  export type Filters = (NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['filters']>)[0]>);
  export type Meta = (NonNullable<(NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['filters']>)[0]>)['meta']>);
  export type KqlQuery = (NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['kqlQuery']>);
  export type FilterQuery = (NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['kqlQuery']>)['filterQuery']>);
  export type Kuery = (NonNullable<(NonNullable<(NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['kqlQuery']>)['filterQuery']>)['kuery']>);
  export type DateRange = (NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['dateRange']>);
  export type Sort = (NonNullable<PersistTimelineMutationMutation['persistTimeline']['timeline']['sort']>);
  export const Document = PersistTimelineMutationDocument;
  export const Component = PersistTimelineMutationComponent;
  export const use = usePersistTimelineMutationMutation;
}

export namespace PersistTimelinePinnedEventMutation {
  export type Variables = PersistTimelinePinnedEventMutationMutationVariables;
  export type Mutation = PersistTimelinePinnedEventMutationMutation;
  export type PersistPinnedEventOnTimeline = (NonNullable<PersistTimelinePinnedEventMutationMutation['persistPinnedEventOnTimeline']>);
  export const Document = PersistTimelinePinnedEventMutationDocument;
  export const Component = PersistTimelinePinnedEventMutationComponent;
  export const use = usePersistTimelinePinnedEventMutationMutation;
}

export namespace GetTlsQuery {
  export type Variables = GetTlsQueryQueryVariables;
  export type Query = GetTlsQueryQuery;
  export type Source = GetTlsQueryQuery['source'];
  export type Tls = GetTlsQueryQuery['source']['Tls'];
  export type Edges = (NonNullable<GetTlsQueryQuery['source']['Tls']['edges'][0]>);
  export type Node = (NonNullable<GetTlsQueryQuery['source']['Tls']['edges'][0]>)['node'];
  export type Cursor = (NonNullable<GetTlsQueryQuery['source']['Tls']['edges'][0]>)['cursor'];
  export type PageInfo = GetTlsQueryQuery['source']['Tls']['pageInfo'];
  export type Inspect = (NonNullable<GetTlsQueryQuery['source']['Tls']['inspect']>);
  export const Document = GetTlsQueryDocument;
  export const Component = GetTlsQueryComponent;
  export const use = useGetTlsQueryQuery;
}

export namespace GetUncommonProcessesQuery {
  export type Variables = GetUncommonProcessesQueryQueryVariables;
  export type Query = GetUncommonProcessesQueryQuery;
  export type Source = GetUncommonProcessesQueryQuery['source'];
  export type UncommonProcesses = GetUncommonProcessesQueryQuery['source']['UncommonProcesses'];
  export type Edges = (NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['edges'][0]>);
  export type Node = (NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['edges'][0]>)['node'];
  export type Process = (NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['edges'][0]>)['node']['process'];
  export type User = (NonNullable<(NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['edges'][0]>)['node']['user']>);
  export type Hosts = (NonNullable<(NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['edges'][0]>)['node']['hosts'][0]>);
  export type Cursor = (NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['edges'][0]>)['cursor'];
  export type PageInfo = GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['pageInfo'];
  export type Inspect = (NonNullable<GetUncommonProcessesQueryQuery['source']['UncommonProcesses']['inspect']>);
  export const Document = GetUncommonProcessesQueryDocument;
  export const Component = GetUncommonProcessesQueryComponent;
  export const use = useGetUncommonProcessesQueryQuery;
}

export namespace GetUsersQuery {
  export type Variables = GetUsersQueryQueryVariables;
  export type Query = GetUsersQueryQuery;
  export type Source = GetUsersQueryQuery['source'];
  export type Users = GetUsersQueryQuery['source']['Users'];
  export type Edges = (NonNullable<GetUsersQueryQuery['source']['Users']['edges'][0]>);
  export type Node = (NonNullable<GetUsersQueryQuery['source']['Users']['edges'][0]>)['node'];
  export type User = (NonNullable<(NonNullable<GetUsersQueryQuery['source']['Users']['edges'][0]>)['node']['user']>);
  export type Cursor = (NonNullable<GetUsersQueryQuery['source']['Users']['edges'][0]>)['cursor'];
  export type PageInfo = GetUsersQueryQuery['source']['Users']['pageInfo'];
  export type Inspect = (NonNullable<GetUsersQueryQuery['source']['Users']['inspect']>);
  export const Document = GetUsersQueryDocument;
  export const Component = GetUsersQueryComponent;
  export const use = useGetUsersQueryQuery;
}
