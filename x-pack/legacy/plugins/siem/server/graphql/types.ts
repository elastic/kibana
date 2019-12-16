/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
*/

/* tslint:disable */
/* eslint-disable */

import { SiemContext } from '../lib/types';

import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type RequireFields<T, K extends keyof T> = { [X in Exclude<keyof T, K>]?: T[X] } & { [P in K]-?: NonNullable<T[P]> };

/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: string,
  String: string,
  Boolean: boolean,
  Int: number,
  Float: number,
  ToStringArray: string[] | string,
  Date: string,
  ToNumberArray: number[] | number,
  ToDateArray: string[] | string,
  ToBooleanArray: boolean[] | boolean,
  EsValue: any,
}

export interface AnomaliesOverTimeData {
  inspect?: Maybe<Inspect>,
  anomaliesOverTime: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
}

export interface AuditdData {
  acct?: Maybe<Scalars['ToStringArray']>,
  terminal?: Maybe<Scalars['ToStringArray']>,
  op?: Maybe<Scalars['ToStringArray']>,
}

export interface AuditdEcsFields {
  result?: Maybe<Scalars['ToStringArray']>,
  session?: Maybe<Scalars['ToStringArray']>,
  data?: Maybe<AuditdData>,
  summary?: Maybe<Summary>,
  sequence?: Maybe<Scalars['ToStringArray']>,
}

export interface AuditEcsFields {
  package?: Maybe<PackageEcsFields>,
}

export interface AuthEcsFields {
  ssh?: Maybe<SshEcsFields>,
}

export interface AuthenticationItem {
  _id: Scalars['String'],
  failures: Scalars['Float'],
  successes: Scalars['Float'],
  user: UserEcsFields,
  lastSuccess?: Maybe<LastSourceHost>,
  lastFailure?: Maybe<LastSourceHost>,
}

export interface AuthenticationsData {
  edges: Array<AuthenticationsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface AuthenticationsEdges {
  node: AuthenticationItem,
  cursor: CursorType,
}

export interface AuthenticationsOverTimeData {
  inspect?: Maybe<Inspect>,
  authenticationsOverTime: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
}

export interface AutonomousSystem {
  number?: Maybe<Scalars['Float']>,
  organization?: Maybe<AutonomousSystemOrganization>,
}

export interface AutonomousSystemItem {
  name?: Maybe<Scalars['String']>,
  number?: Maybe<Scalars['Float']>,
}

export interface AutonomousSystemOrganization {
  name?: Maybe<Scalars['String']>,
}

export interface CloudFields {
  instance?: Maybe<CloudInstance>,
  machine?: Maybe<CloudMachine>,
  provider?: Maybe<Array<Maybe<Scalars['String']>>>,
  region?: Maybe<Array<Maybe<Scalars['String']>>>,
}

export interface CloudInstance {
  id?: Maybe<Array<Maybe<Scalars['String']>>>,
}

export interface CloudMachine {
  type?: Maybe<Array<Maybe<Scalars['String']>>>,
}

export interface ColumnHeaderInput {
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
}

export interface ColumnHeaderResult {
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
}

export interface CursorType {
  value?: Maybe<Scalars['String']>,
  tiebreaker?: Maybe<Scalars['String']>,
}

export interface DataProviderInput {
  id?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  enabled?: Maybe<Scalars['Boolean']>,
  excluded?: Maybe<Scalars['Boolean']>,
  kqlQuery?: Maybe<Scalars['String']>,
  queryMatch?: Maybe<QueryMatchInput>,
  and?: Maybe<Array<DataProviderInput>>,
}

export interface DataProviderResult {
  id?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  enabled?: Maybe<Scalars['Boolean']>,
  excluded?: Maybe<Scalars['Boolean']>,
  kqlQuery?: Maybe<Scalars['String']>,
  queryMatch?: Maybe<QueryMatchResult>,
  and?: Maybe<Array<DataProviderResult>>,
}


export interface DateRangePickerInput {
  start?: Maybe<Scalars['Float']>,
  end?: Maybe<Scalars['Float']>,
}

export interface DateRangePickerResult {
  start?: Maybe<Scalars['Float']>,
  end?: Maybe<Scalars['Float']>,
}

export interface DestinationEcsFields {
  bytes?: Maybe<Scalars['ToNumberArray']>,
  ip?: Maybe<Scalars['ToStringArray']>,
  port?: Maybe<Scalars['ToNumberArray']>,
  domain?: Maybe<Scalars['ToStringArray']>,
  geo?: Maybe<GeoEcsFields>,
  packets?: Maybe<Scalars['ToNumberArray']>,
}

export interface DetailItem {
  field: Scalars['String'],
  values?: Maybe<Scalars['ToStringArray']>,
  originalValue?: Maybe<Scalars['EsValue']>,
}

export enum Direction {
  asc = 'asc',
  desc = 'desc'
}

export interface DnsEcsFields {
  question?: Maybe<DnsQuestionData>,
  resolved_ip?: Maybe<Scalars['ToStringArray']>,
  response_code?: Maybe<Scalars['ToStringArray']>,
}

export interface DnsQuestionData {
  name?: Maybe<Scalars['ToStringArray']>,
  type?: Maybe<Scalars['ToStringArray']>,
}

export interface Ecs {
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
}

export interface EcsEdges {
  node: Ecs,
  cursor: CursorType,
}

export interface EndgameEcsFields {
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
}


export interface EventEcsFields {
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
}

export interface EventsOverTimeData {
  inspect?: Maybe<Inspect>,
  eventsOverTime: Array<MatrixOverTimeHistogramData>,
  totalCount: Scalars['Float'],
}

export interface EventsTimelineData {
  edges: Array<EcsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfo,
  inspect?: Maybe<Inspect>,
}

export interface FavoriteTimelineInput {
  fullName?: Maybe<Scalars['String']>,
  userName?: Maybe<Scalars['String']>,
  favoriteDate?: Maybe<Scalars['Float']>,
}

export interface FavoriteTimelineResult {
  fullName?: Maybe<Scalars['String']>,
  userName?: Maybe<Scalars['String']>,
  favoriteDate?: Maybe<Scalars['Float']>,
}

export interface FileFields {
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
}

export interface FilterMetaTimelineInput {
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
}

export interface FilterMetaTimelineResult {
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
}

export interface FilterTimelineInput {
  exists?: Maybe<Scalars['String']>,
  meta?: Maybe<FilterMetaTimelineInput>,
  match_all?: Maybe<Scalars['String']>,
  missing?: Maybe<Scalars['String']>,
  query?: Maybe<Scalars['String']>,
  range?: Maybe<Scalars['String']>,
  script?: Maybe<Scalars['String']>,
}

export interface FilterTimelineResult {
  exists?: Maybe<Scalars['String']>,
  meta?: Maybe<FilterMetaTimelineResult>,
  match_all?: Maybe<Scalars['String']>,
  missing?: Maybe<Scalars['String']>,
  query?: Maybe<Scalars['String']>,
  range?: Maybe<Scalars['String']>,
  script?: Maybe<Scalars['String']>,
}

export interface FingerprintData {
  sha1?: Maybe<Scalars['ToStringArray']>,
}

export interface FirstLastSeenHost {
  inspect?: Maybe<Inspect>,
  firstSeen?: Maybe<Scalars['Date']>,
  lastSeen?: Maybe<Scalars['Date']>,
}

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

export interface GeoEcsFields {
  city_name?: Maybe<Scalars['ToStringArray']>,
  continent_name?: Maybe<Scalars['ToStringArray']>,
  country_iso_code?: Maybe<Scalars['ToStringArray']>,
  country_name?: Maybe<Scalars['ToStringArray']>,
  location?: Maybe<Location>,
  region_iso_code?: Maybe<Scalars['ToStringArray']>,
  region_name?: Maybe<Scalars['ToStringArray']>,
}

export interface GeoItem {
  geo?: Maybe<GeoEcsFields>,
  flowTarget?: Maybe<FlowTargetSourceDest>,
}

export interface HostEcsFields {
  architecture?: Maybe<Scalars['ToStringArray']>,
  id?: Maybe<Scalars['ToStringArray']>,
  ip?: Maybe<Scalars['ToStringArray']>,
  mac?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  os?: Maybe<OsEcsFields>,
  type?: Maybe<Scalars['ToStringArray']>,
}

export interface HostFields {
  architecture?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  ip?: Maybe<Array<Maybe<Scalars['String']>>>,
  mac?: Maybe<Array<Maybe<Scalars['String']>>>,
  name?: Maybe<Scalars['String']>,
  os?: Maybe<OsFields>,
  type?: Maybe<Scalars['String']>,
}

export interface HostItem {
  _id?: Maybe<Scalars['String']>,
  lastSeen?: Maybe<Scalars['Date']>,
  host?: Maybe<HostEcsFields>,
  cloud?: Maybe<CloudFields>,
  inspect?: Maybe<Inspect>,
}

export interface HostsData {
  edges: Array<HostsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface HostsEdges {
  node: HostItem,
  cursor: CursorType,
}

export enum HostsFields {
  hostName = 'hostName',
  lastSeen = 'lastSeen'
}

export interface HostsSortField {
  field: HostsFields,
  direction: Direction,
}

export interface HttpBodyData {
  content?: Maybe<Scalars['ToStringArray']>,
  bytes?: Maybe<Scalars['ToNumberArray']>,
}

export interface HttpEcsFields {
  version?: Maybe<Scalars['ToStringArray']>,
  request?: Maybe<HttpRequestData>,
  response?: Maybe<HttpResponseData>,
}

export interface HttpRequestData {
  method?: Maybe<Scalars['ToStringArray']>,
  body?: Maybe<HttpBodyData>,
  referrer?: Maybe<Scalars['ToStringArray']>,
  bytes?: Maybe<Scalars['ToNumberArray']>,
}

export interface HttpResponseData {
  status_code?: Maybe<Scalars['ToNumberArray']>,
  body?: Maybe<HttpBodyData>,
  bytes?: Maybe<Scalars['ToNumberArray']>,
}

/** A descriptor of a field in an index */
export interface IndexField {
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
}

export interface Inspect {
  dsl: Array<Scalars['String']>,
  response: Array<Scalars['String']>,
}

export interface IpOverviewData {
  client?: Maybe<Overview>,
  destination?: Maybe<Overview>,
  host: HostEcsFields,
  server?: Maybe<Overview>,
  source?: Maybe<Overview>,
  inspect?: Maybe<Inspect>,
}

export interface KpiHostDetailsData {
  authSuccess?: Maybe<Scalars['Float']>,
  authSuccessHistogram?: Maybe<Array<KpiHostHistogramData>>,
  authFailure?: Maybe<Scalars['Float']>,
  authFailureHistogram?: Maybe<Array<KpiHostHistogramData>>,
  uniqueSourceIps?: Maybe<Scalars['Float']>,
  uniqueSourceIpsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  uniqueDestinationIps?: Maybe<Scalars['Float']>,
  uniqueDestinationIpsHistogram?: Maybe<Array<KpiHostHistogramData>>,
  inspect?: Maybe<Inspect>,
}

export interface KpiHostHistogramData {
  x?: Maybe<Scalars['Float']>,
  y?: Maybe<Scalars['Float']>,
}

export interface KpiHostsData {
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
}

export interface KpiNetworkData {
  networkEvents?: Maybe<Scalars['Float']>,
  uniqueFlowId?: Maybe<Scalars['Float']>,
  uniqueSourcePrivateIps?: Maybe<Scalars['Float']>,
  uniqueSourcePrivateIpsHistogram?: Maybe<Array<KpiNetworkHistogramData>>,
  uniqueDestinationPrivateIps?: Maybe<Scalars['Float']>,
  uniqueDestinationPrivateIpsHistogram?: Maybe<Array<KpiNetworkHistogramData>>,
  dnsQueries?: Maybe<Scalars['Float']>,
  tlsHandshakes?: Maybe<Scalars['Float']>,
  inspect?: Maybe<Inspect>,
}

export interface KpiNetworkHistogramData {
  x?: Maybe<Scalars['Float']>,
  y?: Maybe<Scalars['Float']>,
}

export interface KueryFilterQueryInput {
  kind?: Maybe<Scalars['String']>,
  expression?: Maybe<Scalars['String']>,
}

export interface KueryFilterQueryResult {
  kind?: Maybe<Scalars['String']>,
  expression?: Maybe<Scalars['String']>,
}

export enum LastEventIndexKey {
  hostDetails = 'hostDetails',
  hosts = 'hosts',
  ipDetails = 'ipDetails',
  network = 'network'
}

export interface LastEventTimeData {
  lastSeen?: Maybe<Scalars['Date']>,
  inspect?: Maybe<Inspect>,
}

export interface LastSourceHost {
  timestamp?: Maybe<Scalars['Date']>,
  source?: Maybe<SourceEcsFields>,
  host?: Maybe<HostEcsFields>,
}

export interface LastTimeDetails {
  hostName?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
}

export interface Location {
  lon?: Maybe<Scalars['ToNumberArray']>,
  lat?: Maybe<Scalars['ToNumberArray']>,
}

export interface MatrixOverOrdinalHistogramData {
  x: Scalars['String'],
  y: Scalars['Float'],
  g: Scalars['String'],
}

export interface MatrixOverTimeHistogramData {
  x: Scalars['Float'],
  y: Scalars['Float'],
  g: Scalars['String'],
}

export interface Mutation {
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
}


export interface MutationPersistNoteArgs {
  noteId?: Maybe<Scalars['ID']>,
  version?: Maybe<Scalars['String']>,
  note: NoteInput
}


export interface MutationDeleteNoteArgs {
  id: Array<Scalars['ID']>
}


export interface MutationDeleteNoteByTimelineIdArgs {
  timelineId: Scalars['ID'],
  version?: Maybe<Scalars['String']>
}


export interface MutationPersistPinnedEventOnTimelineArgs {
  pinnedEventId?: Maybe<Scalars['ID']>,
  eventId: Scalars['ID'],
  timelineId?: Maybe<Scalars['ID']>
}


export interface MutationDeletePinnedEventOnTimelineArgs {
  id: Array<Scalars['ID']>
}


export interface MutationDeleteAllPinnedEventsOnTimelineArgs {
  timelineId: Scalars['ID']
}


export interface MutationPersistTimelineArgs {
  id?: Maybe<Scalars['ID']>,
  version?: Maybe<Scalars['String']>,
  timeline: TimelineInput
}


export interface MutationPersistFavoriteArgs {
  timelineId?: Maybe<Scalars['ID']>
}


export interface MutationDeleteTimelineArgs {
  id: Array<Scalars['ID']>
}

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

export interface NetworkDnsData {
  edges: Array<NetworkDnsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
  histogram?: Maybe<Array<MatrixOverOrdinalHistogramData>>,
}

export interface NetworkDnsEdges {
  node: NetworkDnsItem,
  cursor: CursorType,
}

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut'
}

export interface NetworkDnsItem {
  _id?: Maybe<Scalars['String']>,
  dnsBytesIn?: Maybe<Scalars['Float']>,
  dnsBytesOut?: Maybe<Scalars['Float']>,
  dnsName?: Maybe<Scalars['String']>,
  queryCount?: Maybe<Scalars['Float']>,
  uniqueDomains?: Maybe<Scalars['Float']>,
}

export interface NetworkDnsSortField {
  field: NetworkDnsFields,
  direction: Direction,
}

export interface NetworkEcsField {
  bytes?: Maybe<Scalars['ToNumberArray']>,
  community_id?: Maybe<Scalars['ToStringArray']>,
  direction?: Maybe<Scalars['ToStringArray']>,
  packets?: Maybe<Scalars['ToNumberArray']>,
  protocol?: Maybe<Scalars['ToStringArray']>,
  transport?: Maybe<Scalars['ToStringArray']>,
}

export interface NetworkHttpData {
  edges: Array<NetworkHttpEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface NetworkHttpEdges {
  node: NetworkHttpItem,
  cursor: CursorType,
}

export enum NetworkHttpFields {
  domains = 'domains',
  lastHost = 'lastHost',
  lastSourceIp = 'lastSourceIp',
  methods = 'methods',
  path = 'path',
  requestCount = 'requestCount',
  statuses = 'statuses'
}

export interface NetworkHttpItem {
  _id?: Maybe<Scalars['String']>,
  domains: Array<Scalars['String']>,
  lastHost?: Maybe<Scalars['String']>,
  lastSourceIp?: Maybe<Scalars['String']>,
  methods: Array<Scalars['String']>,
  path?: Maybe<Scalars['String']>,
  requestCount?: Maybe<Scalars['Float']>,
  statuses: Array<Scalars['String']>,
}

export interface NetworkHttpSortField {
  direction: Direction,
}

export interface NetworkTopCountriesData {
  edges: Array<NetworkTopCountriesEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface NetworkTopCountriesEdges {
  node: NetworkTopCountriesItem,
  cursor: CursorType,
}

export interface NetworkTopCountriesItem {
  _id?: Maybe<Scalars['String']>,
  source?: Maybe<TopCountriesItemSource>,
  destination?: Maybe<TopCountriesItemDestination>,
  network?: Maybe<TopNetworkTablesEcsField>,
}

export interface NetworkTopNFlowData {
  edges: Array<NetworkTopNFlowEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface NetworkTopNFlowEdges {
  node: NetworkTopNFlowItem,
  cursor: CursorType,
}

export interface NetworkTopNFlowItem {
  _id?: Maybe<Scalars['String']>,
  source?: Maybe<TopNFlowItemSource>,
  destination?: Maybe<TopNFlowItemDestination>,
  network?: Maybe<TopNetworkTablesEcsField>,
}

export enum NetworkTopTablesFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips'
}

export interface NetworkTopTablesSortField {
  field: NetworkTopTablesFields,
  direction: Direction,
}

export interface NoteInput {
  eventId?: Maybe<Scalars['String']>,
  note?: Maybe<Scalars['String']>,
  timelineId?: Maybe<Scalars['String']>,
}

export interface NoteResult {
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
}

export interface OsEcsFields {
  platform?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  full?: Maybe<Scalars['ToStringArray']>,
  family?: Maybe<Scalars['ToStringArray']>,
  version?: Maybe<Scalars['ToStringArray']>,
  kernel?: Maybe<Scalars['ToStringArray']>,
}

export interface OsFields {
  platform?: Maybe<Scalars['String']>,
  name?: Maybe<Scalars['String']>,
  full?: Maybe<Scalars['String']>,
  family?: Maybe<Scalars['String']>,
  version?: Maybe<Scalars['String']>,
  kernel?: Maybe<Scalars['String']>,
}

export interface Overview {
  firstSeen?: Maybe<Scalars['Date']>,
  lastSeen?: Maybe<Scalars['Date']>,
  autonomousSystem: AutonomousSystem,
  geo: GeoEcsFields,
}

export interface OverviewHostData {
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
}

export interface OverviewNetworkData {
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
}

export interface PackageEcsFields {
  arch?: Maybe<Scalars['ToStringArray']>,
  entity_id?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  size?: Maybe<Scalars['ToNumberArray']>,
  summary?: Maybe<Scalars['ToStringArray']>,
  version?: Maybe<Scalars['ToStringArray']>,
}

export interface PageInfo {
  endCursor?: Maybe<CursorType>,
  hasNextPage?: Maybe<Scalars['Boolean']>,
}

export interface PageInfoNote {
  pageIndex: Scalars['Float'],
  pageSize: Scalars['Float'],
}

export interface PageInfoPaginated {
  activePage: Scalars['Float'],
  fakeTotalCount: Scalars['Float'],
  showMorePagesIndicator: Scalars['Boolean'],
}

export interface PageInfoTimeline {
  pageIndex: Scalars['Float'],
  pageSize: Scalars['Float'],
}

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: Scalars['Float'],
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<Scalars['String']>,
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<Scalars['String']>,
}

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: Scalars['Float'],
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: Scalars['Float'],
  /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
  fakePossibleCount: Scalars['Float'],
  /** The querySize parameter is the number of items to be returned */
  querySize: Scalars['Float'],
}

export interface PinnedEvent {
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
}

export interface PrimarySecondary {
  primary?: Maybe<Scalars['ToStringArray']>,
  secondary?: Maybe<Scalars['ToStringArray']>,
  type?: Maybe<Scalars['ToStringArray']>,
}

export interface ProcessEcsFields {
  hash?: Maybe<ProcessHashData>,
  pid?: Maybe<Scalars['ToNumberArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  ppid?: Maybe<Scalars['ToNumberArray']>,
  args?: Maybe<Scalars['ToStringArray']>,
  executable?: Maybe<Scalars['ToStringArray']>,
  title?: Maybe<Scalars['ToStringArray']>,
  thread?: Maybe<Thread>,
  working_directory?: Maybe<Scalars['ToStringArray']>,
}

export interface ProcessHashData {
  md5?: Maybe<Scalars['ToStringArray']>,
  sha1?: Maybe<Scalars['ToStringArray']>,
  sha256?: Maybe<Scalars['ToStringArray']>,
}

export interface Query {
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
}


export interface QueryGetNoteArgs {
  id: Scalars['ID']
}


export interface QueryGetNotesByTimelineIdArgs {
  timelineId: Scalars['ID']
}


export interface QueryGetNotesByEventIdArgs {
  eventId: Scalars['ID']
}


export interface QueryGetAllNotesArgs {
  pageInfo?: Maybe<PageInfoNote>,
  search?: Maybe<Scalars['String']>,
  sort?: Maybe<SortNote>
}


export interface QueryGetAllPinnedEventsByTimelineIdArgs {
  timelineId: Scalars['ID']
}


export interface QuerySourceArgs {
  id: Scalars['ID']
}


export interface QueryGetOneTimelineArgs {
  id: Scalars['ID']
}


export interface QueryGetAllTimelineArgs {
  pageInfo?: Maybe<PageInfoTimeline>,
  search?: Maybe<Scalars['String']>,
  sort?: Maybe<SortTimeline>,
  onlyUserFavorite?: Maybe<Scalars['Boolean']>
}

export interface QueryMatchInput {
  field?: Maybe<Scalars['String']>,
  displayField?: Maybe<Scalars['String']>,
  value?: Maybe<Scalars['String']>,
  displayValue?: Maybe<Scalars['String']>,
  operator?: Maybe<Scalars['String']>,
}

export interface QueryMatchResult {
  field?: Maybe<Scalars['String']>,
  displayField?: Maybe<Scalars['String']>,
  value?: Maybe<Scalars['String']>,
  displayValue?: Maybe<Scalars['String']>,
  operator?: Maybe<Scalars['String']>,
}

export interface ResponseFavoriteTimeline {
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  savedObjectId: Scalars['String'],
  version: Scalars['String'],
  favorite?: Maybe<Array<FavoriteTimelineResult>>,
}

export interface ResponseNote {
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  note: NoteResult,
}

export interface ResponseNotes {
  notes: Array<NoteResult>,
  totalCount?: Maybe<Scalars['Float']>,
}

export interface ResponseTimeline {
  code?: Maybe<Scalars['Float']>,
  message?: Maybe<Scalars['String']>,
  timeline: TimelineResult,
}

export interface ResponseTimelines {
  timeline: Array<Maybe<TimelineResult>>,
  totalCount?: Maybe<Scalars['Float']>,
}

export interface SayMyName {
  /** The id of the source */
  appName: Scalars['String'],
}

export interface SerializedFilterQueryInput {
  filterQuery?: Maybe<SerializedKueryQueryInput>,
}

export interface SerializedFilterQueryResult {
  filterQuery?: Maybe<SerializedKueryQueryResult>,
}

export interface SerializedKueryQueryInput {
  kuery?: Maybe<KueryFilterQueryInput>,
  serializedQuery?: Maybe<Scalars['String']>,
}

export interface SerializedKueryQueryResult {
  kuery?: Maybe<KueryFilterQueryResult>,
  serializedQuery?: Maybe<Scalars['String']>,
}

export interface SortField {
  sortFieldId: Scalars['String'],
  direction: Direction,
}

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

export interface SortNote {
  sortField: SortFieldNote,
  sortOrder: Direction,
}

export interface SortTimeline {
  sortField: SortFieldTimeline,
  sortOrder: Direction,
}

export interface SortTimelineInput {
  columnId?: Maybe<Scalars['String']>,
  sortDirection?: Maybe<Scalars['String']>,
}

export interface SortTimelineResult {
  columnId?: Maybe<Scalars['String']>,
  sortDirection?: Maybe<Scalars['String']>,
}

export interface Source {
  /** The id of the source */
  id: Scalars['ID'],
  /** The raw configuration of the source */
  configuration: SourceConfiguration,
  /** The status of the source */
  status: SourceStatus,
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
}


export interface SourceAnomaliesOverTimeArgs {
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceAuthenticationsArgs {
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceAuthenticationsOverTimeArgs {
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceTimelineArgs {
  pagination: PaginationInput,
  sortField: SortField,
  fieldRequested: Array<Scalars['String']>,
  timerange?: Maybe<TimerangeInput>,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceTimelineDetailsArgs {
  eventId: Scalars['String'],
  indexName: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
}


export interface SourceLastEventTimeArgs {
  id?: Maybe<Scalars['String']>,
  indexKey: LastEventIndexKey,
  details: LastTimeDetails,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceEventsOverTimeArgs {
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceHostsArgs {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  sort: HostsSortField,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceHostOverviewArgs {
  id?: Maybe<Scalars['String']>,
  hostName: Scalars['String'],
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceHostFirstLastSeenArgs {
  id?: Maybe<Scalars['String']>,
  hostName: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
}


export interface SourceIpOverviewArgs {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  defaultIndex: Array<Scalars['String']>
}


export interface SourceUsersArgs {
  filterQuery?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  pagination: PaginationInputPaginated,
  sort: UsersSortField,
  flowTarget: FlowTarget,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceKpiNetworkArgs {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceKpiHostsArgs {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceKpiHostDetailsArgs {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceNetworkTopCountriesArgs {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
  flowTarget: FlowTargetSourceDest,
  pagination: PaginationInputPaginated,
  sort: NetworkTopTablesSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceNetworkTopNFlowArgs {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
  flowTarget: FlowTargetSourceDest,
  pagination: PaginationInputPaginated,
  sort: NetworkTopTablesSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceNetworkDnsArgs {
  filterQuery?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  isPtrIncluded: Scalars['Boolean'],
  pagination: PaginationInputPaginated,
  sort: NetworkDnsSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceNetworkHttpArgs {
  id?: Maybe<Scalars['String']>,
  filterQuery?: Maybe<Scalars['String']>,
  ip?: Maybe<Scalars['String']>,
  pagination: PaginationInputPaginated,
  sort: NetworkHttpSortField,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceOverviewNetworkArgs {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceOverviewHostArgs {
  id?: Maybe<Scalars['String']>,
  timerange: TimerangeInput,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceTlsArgs {
  filterQuery?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['String']>,
  ip: Scalars['String'],
  pagination: PaginationInputPaginated,
  sort: TlsSortField,
  flowTarget: FlowTargetSourceDest,
  timerange: TimerangeInput,
  defaultIndex: Array<Scalars['String']>
}


export interface SourceUncommonProcessesArgs {
  timerange: TimerangeInput,
  pagination: PaginationInputPaginated,
  filterQuery?: Maybe<Scalars['String']>,
  defaultIndex: Array<Scalars['String']>
}

/** A set of configuration options for a security data source */
export interface SourceConfiguration {
  /** The field mapping to use for this source */
  fields: SourceFields,
}

export interface SourceEcsFields {
  bytes?: Maybe<Scalars['ToNumberArray']>,
  ip?: Maybe<Scalars['ToStringArray']>,
  port?: Maybe<Scalars['ToNumberArray']>,
  domain?: Maybe<Scalars['ToStringArray']>,
  geo?: Maybe<GeoEcsFields>,
  packets?: Maybe<Scalars['ToNumberArray']>,
}

/** A mapping of semantic fields to their document counterparts */
export interface SourceFields {
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
}

/** The status of an infrastructure data source */
export interface SourceStatus {
  /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
  indicesExist: Scalars['Boolean'],
  /** The list of fields defined in the index mappings */
  indexFields: Array<IndexField>,
}


/** The status of an infrastructure data source */
export interface SourceStatusIndicesExistArgs {
  defaultIndex: Array<Scalars['String']>
}


/** The status of an infrastructure data source */
export interface SourceStatusIndexFieldsArgs {
  defaultIndex: Array<Scalars['String']>
}

export interface SshEcsFields {
  method?: Maybe<Scalars['ToStringArray']>,
  signature?: Maybe<Scalars['ToStringArray']>,
}

export interface Summary {
  actor?: Maybe<PrimarySecondary>,
  object?: Maybe<PrimarySecondary>,
  how?: Maybe<Scalars['ToStringArray']>,
  message_type?: Maybe<Scalars['ToStringArray']>,
  sequence?: Maybe<Scalars['ToStringArray']>,
}

export interface SuricataAlertData {
  signature?: Maybe<Scalars['ToStringArray']>,
  signature_id?: Maybe<Scalars['ToNumberArray']>,
}

export interface SuricataEcsFields {
  eve?: Maybe<SuricataEveData>,
}

export interface SuricataEveData {
  alert?: Maybe<SuricataAlertData>,
  flow_id?: Maybe<Scalars['ToNumberArray']>,
  proto?: Maybe<Scalars['ToStringArray']>,
}

export interface SystemEcsField {
  audit?: Maybe<AuditEcsFields>,
  auth?: Maybe<AuthEcsFields>,
}

export interface Thread {
  id?: Maybe<Scalars['ToNumberArray']>,
  start?: Maybe<Scalars['ToStringArray']>,
}

export interface TimelineData {
  edges: Array<TimelineEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfo,
  inspect?: Maybe<Inspect>,
}

export interface TimelineDetailsData {
  data?: Maybe<Array<DetailItem>>,
  inspect?: Maybe<Inspect>,
}

export interface TimelineEdges {
  node: TimelineItem,
  cursor: CursorType,
}

export interface TimelineInput {
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
}

export interface TimelineItem {
  _id: Scalars['String'],
  _index?: Maybe<Scalars['String']>,
  data: Array<TimelineNonEcsData>,
  ecs: Ecs,
}

export interface TimelineNonEcsData {
  field: Scalars['String'],
  value?: Maybe<Scalars['ToStringArray']>,
}

export interface TimelineResult {
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
}

export interface TimerangeInput {
  /** 
 * The interval string to use for last bucket. The format is '{value}{unit}'. For
   * example '5m' would return the metrics for the last 5 minutes of the timespan.
 */
  interval: Scalars['String'],
  /** The end of the timerange */
  to: Scalars['Float'],
  /** The beginning of the timerange */
  from: Scalars['Float'],
}

export interface TlsClientCertificateData {
  fingerprint?: Maybe<FingerprintData>,
}

export interface TlsData {
  edges: Array<TlsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface TlsEcsFields {
  client_certificate?: Maybe<TlsClientCertificateData>,
  fingerprints?: Maybe<TlsFingerprintsData>,
  server_certificate?: Maybe<TlsServerCertificateData>,
}

export interface TlsEdges {
  node: TlsNode,
  cursor: CursorType,
}

export enum TlsFields {
  _id = '_id'
}

export interface TlsFingerprintsData {
  ja3?: Maybe<TlsJa3Data>,
}

export interface TlsJa3Data {
  hash?: Maybe<Scalars['ToStringArray']>,
}

export interface TlsNode {
  _id?: Maybe<Scalars['String']>,
  timestamp?: Maybe<Scalars['Date']>,
  alternativeNames?: Maybe<Array<Scalars['String']>>,
  notAfter?: Maybe<Array<Scalars['String']>>,
  commonNames?: Maybe<Array<Scalars['String']>>,
  ja3?: Maybe<Array<Scalars['String']>>,
  issuerNames?: Maybe<Array<Scalars['String']>>,
}

export interface TlsServerCertificateData {
  fingerprint?: Maybe<FingerprintData>,
}

export interface TlsSortField {
  field: TlsFields,
  direction: Direction,
}




export interface TopCountriesItemDestination {
  country?: Maybe<Scalars['String']>,
  destination_ips?: Maybe<Scalars['Float']>,
  flows?: Maybe<Scalars['Float']>,
  location?: Maybe<GeoItem>,
  source_ips?: Maybe<Scalars['Float']>,
}

export interface TopCountriesItemSource {
  country?: Maybe<Scalars['String']>,
  destination_ips?: Maybe<Scalars['Float']>,
  flows?: Maybe<Scalars['Float']>,
  location?: Maybe<GeoItem>,
  source_ips?: Maybe<Scalars['Float']>,
}

export interface TopNetworkTablesEcsField {
  bytes_in?: Maybe<Scalars['Float']>,
  bytes_out?: Maybe<Scalars['Float']>,
}

export interface TopNFlowItemDestination {
  autonomous_system?: Maybe<AutonomousSystemItem>,
  domain?: Maybe<Array<Scalars['String']>>,
  ip?: Maybe<Scalars['String']>,
  location?: Maybe<GeoItem>,
  flows?: Maybe<Scalars['Float']>,
  source_ips?: Maybe<Scalars['Float']>,
}

export interface TopNFlowItemSource {
  autonomous_system?: Maybe<AutonomousSystemItem>,
  domain?: Maybe<Array<Scalars['String']>>,
  ip?: Maybe<Scalars['String']>,
  location?: Maybe<GeoItem>,
  flows?: Maybe<Scalars['Float']>,
  destination_ips?: Maybe<Scalars['Float']>,
}


export interface UncommonProcessesData {
  edges: Array<UncommonProcessesEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface UncommonProcessesEdges {
  node: UncommonProcessItem,
  cursor: CursorType,
}

export interface UncommonProcessItem {
  _id: Scalars['String'],
  instances: Scalars['Float'],
  process: ProcessEcsFields,
  hosts: Array<HostEcsFields>,
  user?: Maybe<UserEcsFields>,
}

export interface UrlEcsFields {
  domain?: Maybe<Scalars['ToStringArray']>,
  original?: Maybe<Scalars['ToStringArray']>,
  username?: Maybe<Scalars['ToStringArray']>,
  password?: Maybe<Scalars['ToStringArray']>,
}

export interface UserEcsFields {
  domain?: Maybe<Scalars['ToStringArray']>,
  id?: Maybe<Scalars['ToStringArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  full_name?: Maybe<Scalars['ToStringArray']>,
  email?: Maybe<Scalars['ToStringArray']>,
  hash?: Maybe<Scalars['ToStringArray']>,
  group?: Maybe<Scalars['ToStringArray']>,
}

export interface UsersData {
  edges: Array<UsersEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
}

export interface UsersEdges {
  node: UsersNode,
  cursor: CursorType,
}

export enum UsersFields {
  name = 'name',
  count = 'count'
}

export interface UsersItem {
  name?: Maybe<Scalars['String']>,
  id?: Maybe<Scalars['ToStringArray']>,
  groupId?: Maybe<Scalars['ToStringArray']>,
  groupName?: Maybe<Scalars['ToStringArray']>,
  count?: Maybe<Scalars['Float']>,
}

export interface UsersNode {
  _id?: Maybe<Scalars['String']>,
  timestamp?: Maybe<Scalars['Date']>,
  user?: Maybe<UsersItem>,
}

export interface UsersSortField {
  field: UsersFields,
  direction: Direction,
}

export interface WinlogEcsFields {
  event_id?: Maybe<Scalars['ToNumberArray']>,
}

export interface ZeekConnectionData {
  local_resp?: Maybe<Scalars['ToBooleanArray']>,
  local_orig?: Maybe<Scalars['ToBooleanArray']>,
  missed_bytes?: Maybe<Scalars['ToNumberArray']>,
  state?: Maybe<Scalars['ToStringArray']>,
  history?: Maybe<Scalars['ToStringArray']>,
}

export interface ZeekDnsData {
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
}

export interface ZeekEcsFields {
  session_id?: Maybe<Scalars['ToStringArray']>,
  connection?: Maybe<ZeekConnectionData>,
  notice?: Maybe<ZeekNoticeData>,
  dns?: Maybe<ZeekDnsData>,
  http?: Maybe<ZeekHttpData>,
  files?: Maybe<ZeekFileData>,
  ssl?: Maybe<ZeekSslData>,
}

export interface ZeekFileData {
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
}

export interface ZeekHttpData {
  resp_mime_types?: Maybe<Scalars['ToStringArray']>,
  trans_depth?: Maybe<Scalars['ToStringArray']>,
  status_msg?: Maybe<Scalars['ToStringArray']>,
  resp_fuids?: Maybe<Scalars['ToStringArray']>,
  tags?: Maybe<Scalars['ToStringArray']>,
}

export interface ZeekNoticeData {
  suppress_for?: Maybe<Scalars['ToNumberArray']>,
  msg?: Maybe<Scalars['ToStringArray']>,
  note?: Maybe<Scalars['ToStringArray']>,
  sub?: Maybe<Scalars['ToStringArray']>,
  dst?: Maybe<Scalars['ToStringArray']>,
  dropped?: Maybe<Scalars['ToBooleanArray']>,
  peer_descr?: Maybe<Scalars['ToStringArray']>,
}

export interface ZeekSslData {
  cipher?: Maybe<Scalars['ToStringArray']>,
  established?: Maybe<Scalars['ToBooleanArray']>,
  resumed?: Maybe<Scalars['ToBooleanArray']>,
  version?: Maybe<Scalars['ToStringArray']>,
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;


export type StitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Query: ResolverTypeWrapper<{}>,
  ID: ResolverTypeWrapper<Scalars['ID']>,
  NoteResult: ResolverTypeWrapper<NoteResult>,
  String: ResolverTypeWrapper<Scalars['String']>,
  Float: ResolverTypeWrapper<Scalars['Float']>,
  PageInfoNote: PageInfoNote,
  SortNote: SortNote,
  SortFieldNote: SortFieldNote,
  Direction: Direction,
  ResponseNotes: ResolverTypeWrapper<ResponseNotes>,
  PinnedEvent: ResolverTypeWrapper<PinnedEvent>,
  Source: ResolverTypeWrapper<Source>,
  SourceConfiguration: ResolverTypeWrapper<SourceConfiguration>,
  SourceFields: ResolverTypeWrapper<SourceFields>,
  SourceStatus: ResolverTypeWrapper<SourceStatus>,
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>,
  IndexField: ResolverTypeWrapper<IndexField>,
  TimerangeInput: TimerangeInput,
  AnomaliesOverTimeData: ResolverTypeWrapper<AnomaliesOverTimeData>,
  Inspect: ResolverTypeWrapper<Inspect>,
  MatrixOverTimeHistogramData: ResolverTypeWrapper<MatrixOverTimeHistogramData>,
  PaginationInputPaginated: PaginationInputPaginated,
  AuthenticationsData: ResolverTypeWrapper<AuthenticationsData>,
  AuthenticationsEdges: ResolverTypeWrapper<AuthenticationsEdges>,
  AuthenticationItem: ResolverTypeWrapper<AuthenticationItem>,
  UserEcsFields: ResolverTypeWrapper<UserEcsFields>,
  ToStringArray: ResolverTypeWrapper<Scalars['ToStringArray']>,
  LastSourceHost: ResolverTypeWrapper<LastSourceHost>,
  Date: ResolverTypeWrapper<Scalars['Date']>,
  SourceEcsFields: ResolverTypeWrapper<SourceEcsFields>,
  ToNumberArray: ResolverTypeWrapper<Scalars['ToNumberArray']>,
  GeoEcsFields: ResolverTypeWrapper<GeoEcsFields>,
  Location: ResolverTypeWrapper<Location>,
  HostEcsFields: ResolverTypeWrapper<HostEcsFields>,
  OsEcsFields: ResolverTypeWrapper<OsEcsFields>,
  CursorType: ResolverTypeWrapper<CursorType>,
  PageInfoPaginated: ResolverTypeWrapper<PageInfoPaginated>,
  AuthenticationsOverTimeData: ResolverTypeWrapper<AuthenticationsOverTimeData>,
  PaginationInput: PaginationInput,
  SortField: SortField,
  TimelineData: ResolverTypeWrapper<TimelineData>,
  TimelineEdges: ResolverTypeWrapper<TimelineEdges>,
  TimelineItem: ResolverTypeWrapper<TimelineItem>,
  TimelineNonEcsData: ResolverTypeWrapper<TimelineNonEcsData>,
  ECS: ResolverTypeWrapper<Ecs>,
  AuditdEcsFields: ResolverTypeWrapper<AuditdEcsFields>,
  AuditdData: ResolverTypeWrapper<AuditdData>,
  Summary: ResolverTypeWrapper<Summary>,
  PrimarySecondary: ResolverTypeWrapper<PrimarySecondary>,
  DestinationEcsFields: ResolverTypeWrapper<DestinationEcsFields>,
  DnsEcsFields: ResolverTypeWrapper<DnsEcsFields>,
  DnsQuestionData: ResolverTypeWrapper<DnsQuestionData>,
  EndgameEcsFields: ResolverTypeWrapper<EndgameEcsFields>,
  EventEcsFields: ResolverTypeWrapper<EventEcsFields>,
  ToDateArray: ResolverTypeWrapper<Scalars['ToDateArray']>,
  NetworkEcsField: ResolverTypeWrapper<NetworkEcsField>,
  SuricataEcsFields: ResolverTypeWrapper<SuricataEcsFields>,
  SuricataEveData: ResolverTypeWrapper<SuricataEveData>,
  SuricataAlertData: ResolverTypeWrapper<SuricataAlertData>,
  TlsEcsFields: ResolverTypeWrapper<TlsEcsFields>,
  TlsClientCertificateData: ResolverTypeWrapper<TlsClientCertificateData>,
  FingerprintData: ResolverTypeWrapper<FingerprintData>,
  TlsFingerprintsData: ResolverTypeWrapper<TlsFingerprintsData>,
  TlsJa3Data: ResolverTypeWrapper<TlsJa3Data>,
  TlsServerCertificateData: ResolverTypeWrapper<TlsServerCertificateData>,
  ZeekEcsFields: ResolverTypeWrapper<ZeekEcsFields>,
  ZeekConnectionData: ResolverTypeWrapper<ZeekConnectionData>,
  ToBooleanArray: ResolverTypeWrapper<Scalars['ToBooleanArray']>,
  ZeekNoticeData: ResolverTypeWrapper<ZeekNoticeData>,
  ZeekDnsData: ResolverTypeWrapper<ZeekDnsData>,
  ZeekHttpData: ResolverTypeWrapper<ZeekHttpData>,
  ZeekFileData: ResolverTypeWrapper<ZeekFileData>,
  ZeekSslData: ResolverTypeWrapper<ZeekSslData>,
  HttpEcsFields: ResolverTypeWrapper<HttpEcsFields>,
  HttpRequestData: ResolverTypeWrapper<HttpRequestData>,
  HttpBodyData: ResolverTypeWrapper<HttpBodyData>,
  HttpResponseData: ResolverTypeWrapper<HttpResponseData>,
  UrlEcsFields: ResolverTypeWrapper<UrlEcsFields>,
  WinlogEcsFields: ResolverTypeWrapper<WinlogEcsFields>,
  ProcessEcsFields: ResolverTypeWrapper<ProcessEcsFields>,
  ProcessHashData: ResolverTypeWrapper<ProcessHashData>,
  Thread: ResolverTypeWrapper<Thread>,
  FileFields: ResolverTypeWrapper<FileFields>,
  SystemEcsField: ResolverTypeWrapper<SystemEcsField>,
  AuditEcsFields: ResolverTypeWrapper<AuditEcsFields>,
  PackageEcsFields: ResolverTypeWrapper<PackageEcsFields>,
  AuthEcsFields: ResolverTypeWrapper<AuthEcsFields>,
  SshEcsFields: ResolverTypeWrapper<SshEcsFields>,
  PageInfo: ResolverTypeWrapper<PageInfo>,
  TimelineDetailsData: ResolverTypeWrapper<TimelineDetailsData>,
  DetailItem: ResolverTypeWrapper<DetailItem>,
  EsValue: ResolverTypeWrapper<Scalars['EsValue']>,
  LastEventIndexKey: LastEventIndexKey,
  LastTimeDetails: LastTimeDetails,
  LastEventTimeData: ResolverTypeWrapper<LastEventTimeData>,
  EventsOverTimeData: ResolverTypeWrapper<EventsOverTimeData>,
  HostsSortField: HostsSortField,
  HostsFields: HostsFields,
  HostsData: ResolverTypeWrapper<HostsData>,
  HostsEdges: ResolverTypeWrapper<HostsEdges>,
  HostItem: ResolverTypeWrapper<HostItem>,
  CloudFields: ResolverTypeWrapper<CloudFields>,
  CloudInstance: ResolverTypeWrapper<CloudInstance>,
  CloudMachine: ResolverTypeWrapper<CloudMachine>,
  FirstLastSeenHost: ResolverTypeWrapper<FirstLastSeenHost>,
  IpOverviewData: ResolverTypeWrapper<IpOverviewData>,
  Overview: ResolverTypeWrapper<Overview>,
  AutonomousSystem: ResolverTypeWrapper<AutonomousSystem>,
  AutonomousSystemOrganization: ResolverTypeWrapper<AutonomousSystemOrganization>,
  UsersSortField: UsersSortField,
  UsersFields: UsersFields,
  FlowTarget: FlowTarget,
  UsersData: ResolverTypeWrapper<UsersData>,
  UsersEdges: ResolverTypeWrapper<UsersEdges>,
  UsersNode: ResolverTypeWrapper<UsersNode>,
  UsersItem: ResolverTypeWrapper<UsersItem>,
  KpiNetworkData: ResolverTypeWrapper<KpiNetworkData>,
  KpiNetworkHistogramData: ResolverTypeWrapper<KpiNetworkHistogramData>,
  KpiHostsData: ResolverTypeWrapper<KpiHostsData>,
  KpiHostHistogramData: ResolverTypeWrapper<KpiHostHistogramData>,
  KpiHostDetailsData: ResolverTypeWrapper<KpiHostDetailsData>,
  FlowTargetSourceDest: FlowTargetSourceDest,
  NetworkTopTablesSortField: NetworkTopTablesSortField,
  NetworkTopTablesFields: NetworkTopTablesFields,
  NetworkTopCountriesData: ResolverTypeWrapper<NetworkTopCountriesData>,
  NetworkTopCountriesEdges: ResolverTypeWrapper<NetworkTopCountriesEdges>,
  NetworkTopCountriesItem: ResolverTypeWrapper<NetworkTopCountriesItem>,
  TopCountriesItemSource: ResolverTypeWrapper<TopCountriesItemSource>,
  GeoItem: ResolverTypeWrapper<GeoItem>,
  TopCountriesItemDestination: ResolverTypeWrapper<TopCountriesItemDestination>,
  TopNetworkTablesEcsField: ResolverTypeWrapper<TopNetworkTablesEcsField>,
  NetworkTopNFlowData: ResolverTypeWrapper<NetworkTopNFlowData>,
  NetworkTopNFlowEdges: ResolverTypeWrapper<NetworkTopNFlowEdges>,
  NetworkTopNFlowItem: ResolverTypeWrapper<NetworkTopNFlowItem>,
  TopNFlowItemSource: ResolverTypeWrapper<TopNFlowItemSource>,
  AutonomousSystemItem: ResolverTypeWrapper<AutonomousSystemItem>,
  TopNFlowItemDestination: ResolverTypeWrapper<TopNFlowItemDestination>,
  NetworkDnsSortField: NetworkDnsSortField,
  NetworkDnsFields: NetworkDnsFields,
  NetworkDnsData: ResolverTypeWrapper<NetworkDnsData>,
  NetworkDnsEdges: ResolverTypeWrapper<NetworkDnsEdges>,
  NetworkDnsItem: ResolverTypeWrapper<NetworkDnsItem>,
  MatrixOverOrdinalHistogramData: ResolverTypeWrapper<MatrixOverOrdinalHistogramData>,
  NetworkHttpSortField: NetworkHttpSortField,
  NetworkHttpData: ResolverTypeWrapper<NetworkHttpData>,
  NetworkHttpEdges: ResolverTypeWrapper<NetworkHttpEdges>,
  NetworkHttpItem: ResolverTypeWrapper<NetworkHttpItem>,
  OverviewNetworkData: ResolverTypeWrapper<OverviewNetworkData>,
  OverviewHostData: ResolverTypeWrapper<OverviewHostData>,
  TlsSortField: TlsSortField,
  TlsFields: TlsFields,
  TlsData: ResolverTypeWrapper<TlsData>,
  TlsEdges: ResolverTypeWrapper<TlsEdges>,
  TlsNode: ResolverTypeWrapper<TlsNode>,
  UncommonProcessesData: ResolverTypeWrapper<UncommonProcessesData>,
  UncommonProcessesEdges: ResolverTypeWrapper<UncommonProcessesEdges>,
  UncommonProcessItem: ResolverTypeWrapper<UncommonProcessItem>,
  SayMyName: ResolverTypeWrapper<SayMyName>,
  TimelineResult: ResolverTypeWrapper<TimelineResult>,
  ColumnHeaderResult: ResolverTypeWrapper<ColumnHeaderResult>,
  DataProviderResult: ResolverTypeWrapper<DataProviderResult>,
  QueryMatchResult: ResolverTypeWrapper<QueryMatchResult>,
  DateRangePickerResult: ResolverTypeWrapper<DateRangePickerResult>,
  FavoriteTimelineResult: ResolverTypeWrapper<FavoriteTimelineResult>,
  FilterTimelineResult: ResolverTypeWrapper<FilterTimelineResult>,
  FilterMetaTimelineResult: ResolverTypeWrapper<FilterMetaTimelineResult>,
  SerializedFilterQueryResult: ResolverTypeWrapper<SerializedFilterQueryResult>,
  SerializedKueryQueryResult: ResolverTypeWrapper<SerializedKueryQueryResult>,
  KueryFilterQueryResult: ResolverTypeWrapper<KueryFilterQueryResult>,
  SortTimelineResult: ResolverTypeWrapper<SortTimelineResult>,
  PageInfoTimeline: PageInfoTimeline,
  SortTimeline: SortTimeline,
  SortFieldTimeline: SortFieldTimeline,
  ResponseTimelines: ResolverTypeWrapper<ResponseTimelines>,
  Mutation: ResolverTypeWrapper<{}>,
  NoteInput: NoteInput,
  ResponseNote: ResolverTypeWrapper<ResponseNote>,
  TimelineInput: TimelineInput,
  ColumnHeaderInput: ColumnHeaderInput,
  DataProviderInput: DataProviderInput,
  QueryMatchInput: QueryMatchInput,
  FilterTimelineInput: FilterTimelineInput,
  FilterMetaTimelineInput: FilterMetaTimelineInput,
  SerializedFilterQueryInput: SerializedFilterQueryInput,
  SerializedKueryQueryInput: SerializedKueryQueryInput,
  KueryFilterQueryInput: KueryFilterQueryInput,
  DateRangePickerInput: DateRangePickerInput,
  SortTimelineInput: SortTimelineInput,
  ResponseTimeline: ResolverTypeWrapper<ResponseTimeline>,
  ResponseFavoriteTimeline: ResolverTypeWrapper<ResponseFavoriteTimeline>,
  EcsEdges: ResolverTypeWrapper<EcsEdges>,
  EventsTimelineData: ResolverTypeWrapper<EventsTimelineData>,
  FavoriteTimelineInput: FavoriteTimelineInput,
  FlowDirection: FlowDirection,
  HostFields: ResolverTypeWrapper<HostFields>,
  OsFields: ResolverTypeWrapper<OsFields>,
  NetworkDirectionEcs: NetworkDirectionEcs,
  NetworkHttpFields: NetworkHttpFields,
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Query: {},
  ID: Scalars['ID'],
  NoteResult: NoteResult,
  String: Scalars['String'],
  Float: Scalars['Float'],
  PageInfoNote: PageInfoNote,
  SortNote: SortNote,
  SortFieldNote: SortFieldNote,
  Direction: Direction,
  ResponseNotes: ResponseNotes,
  PinnedEvent: PinnedEvent,
  Source: Source,
  SourceConfiguration: SourceConfiguration,
  SourceFields: SourceFields,
  SourceStatus: SourceStatus,
  Boolean: Scalars['Boolean'],
  IndexField: IndexField,
  TimerangeInput: TimerangeInput,
  AnomaliesOverTimeData: AnomaliesOverTimeData,
  Inspect: Inspect,
  MatrixOverTimeHistogramData: MatrixOverTimeHistogramData,
  PaginationInputPaginated: PaginationInputPaginated,
  AuthenticationsData: AuthenticationsData,
  AuthenticationsEdges: AuthenticationsEdges,
  AuthenticationItem: AuthenticationItem,
  UserEcsFields: UserEcsFields,
  ToStringArray: Scalars['ToStringArray'],
  LastSourceHost: LastSourceHost,
  Date: Scalars['Date'],
  SourceEcsFields: SourceEcsFields,
  ToNumberArray: Scalars['ToNumberArray'],
  GeoEcsFields: GeoEcsFields,
  Location: Location,
  HostEcsFields: HostEcsFields,
  OsEcsFields: OsEcsFields,
  CursorType: CursorType,
  PageInfoPaginated: PageInfoPaginated,
  AuthenticationsOverTimeData: AuthenticationsOverTimeData,
  PaginationInput: PaginationInput,
  SortField: SortField,
  TimelineData: TimelineData,
  TimelineEdges: TimelineEdges,
  TimelineItem: TimelineItem,
  TimelineNonEcsData: TimelineNonEcsData,
  ECS: Ecs,
  AuditdEcsFields: AuditdEcsFields,
  AuditdData: AuditdData,
  Summary: Summary,
  PrimarySecondary: PrimarySecondary,
  DestinationEcsFields: DestinationEcsFields,
  DnsEcsFields: DnsEcsFields,
  DnsQuestionData: DnsQuestionData,
  EndgameEcsFields: EndgameEcsFields,
  EventEcsFields: EventEcsFields,
  ToDateArray: Scalars['ToDateArray'],
  NetworkEcsField: NetworkEcsField,
  SuricataEcsFields: SuricataEcsFields,
  SuricataEveData: SuricataEveData,
  SuricataAlertData: SuricataAlertData,
  TlsEcsFields: TlsEcsFields,
  TlsClientCertificateData: TlsClientCertificateData,
  FingerprintData: FingerprintData,
  TlsFingerprintsData: TlsFingerprintsData,
  TlsJa3Data: TlsJa3Data,
  TlsServerCertificateData: TlsServerCertificateData,
  ZeekEcsFields: ZeekEcsFields,
  ZeekConnectionData: ZeekConnectionData,
  ToBooleanArray: Scalars['ToBooleanArray'],
  ZeekNoticeData: ZeekNoticeData,
  ZeekDnsData: ZeekDnsData,
  ZeekHttpData: ZeekHttpData,
  ZeekFileData: ZeekFileData,
  ZeekSslData: ZeekSslData,
  HttpEcsFields: HttpEcsFields,
  HttpRequestData: HttpRequestData,
  HttpBodyData: HttpBodyData,
  HttpResponseData: HttpResponseData,
  UrlEcsFields: UrlEcsFields,
  WinlogEcsFields: WinlogEcsFields,
  ProcessEcsFields: ProcessEcsFields,
  ProcessHashData: ProcessHashData,
  Thread: Thread,
  FileFields: FileFields,
  SystemEcsField: SystemEcsField,
  AuditEcsFields: AuditEcsFields,
  PackageEcsFields: PackageEcsFields,
  AuthEcsFields: AuthEcsFields,
  SshEcsFields: SshEcsFields,
  PageInfo: PageInfo,
  TimelineDetailsData: TimelineDetailsData,
  DetailItem: DetailItem,
  EsValue: Scalars['EsValue'],
  LastEventIndexKey: LastEventIndexKey,
  LastTimeDetails: LastTimeDetails,
  LastEventTimeData: LastEventTimeData,
  EventsOverTimeData: EventsOverTimeData,
  HostsSortField: HostsSortField,
  HostsFields: HostsFields,
  HostsData: HostsData,
  HostsEdges: HostsEdges,
  HostItem: HostItem,
  CloudFields: CloudFields,
  CloudInstance: CloudInstance,
  CloudMachine: CloudMachine,
  FirstLastSeenHost: FirstLastSeenHost,
  IpOverviewData: IpOverviewData,
  Overview: Overview,
  AutonomousSystem: AutonomousSystem,
  AutonomousSystemOrganization: AutonomousSystemOrganization,
  UsersSortField: UsersSortField,
  UsersFields: UsersFields,
  FlowTarget: FlowTarget,
  UsersData: UsersData,
  UsersEdges: UsersEdges,
  UsersNode: UsersNode,
  UsersItem: UsersItem,
  KpiNetworkData: KpiNetworkData,
  KpiNetworkHistogramData: KpiNetworkHistogramData,
  KpiHostsData: KpiHostsData,
  KpiHostHistogramData: KpiHostHistogramData,
  KpiHostDetailsData: KpiHostDetailsData,
  FlowTargetSourceDest: FlowTargetSourceDest,
  NetworkTopTablesSortField: NetworkTopTablesSortField,
  NetworkTopTablesFields: NetworkTopTablesFields,
  NetworkTopCountriesData: NetworkTopCountriesData,
  NetworkTopCountriesEdges: NetworkTopCountriesEdges,
  NetworkTopCountriesItem: NetworkTopCountriesItem,
  TopCountriesItemSource: TopCountriesItemSource,
  GeoItem: GeoItem,
  TopCountriesItemDestination: TopCountriesItemDestination,
  TopNetworkTablesEcsField: TopNetworkTablesEcsField,
  NetworkTopNFlowData: NetworkTopNFlowData,
  NetworkTopNFlowEdges: NetworkTopNFlowEdges,
  NetworkTopNFlowItem: NetworkTopNFlowItem,
  TopNFlowItemSource: TopNFlowItemSource,
  AutonomousSystemItem: AutonomousSystemItem,
  TopNFlowItemDestination: TopNFlowItemDestination,
  NetworkDnsSortField: NetworkDnsSortField,
  NetworkDnsFields: NetworkDnsFields,
  NetworkDnsData: NetworkDnsData,
  NetworkDnsEdges: NetworkDnsEdges,
  NetworkDnsItem: NetworkDnsItem,
  MatrixOverOrdinalHistogramData: MatrixOverOrdinalHistogramData,
  NetworkHttpSortField: NetworkHttpSortField,
  NetworkHttpData: NetworkHttpData,
  NetworkHttpEdges: NetworkHttpEdges,
  NetworkHttpItem: NetworkHttpItem,
  OverviewNetworkData: OverviewNetworkData,
  OverviewHostData: OverviewHostData,
  TlsSortField: TlsSortField,
  TlsFields: TlsFields,
  TlsData: TlsData,
  TlsEdges: TlsEdges,
  TlsNode: TlsNode,
  UncommonProcessesData: UncommonProcessesData,
  UncommonProcessesEdges: UncommonProcessesEdges,
  UncommonProcessItem: UncommonProcessItem,
  SayMyName: SayMyName,
  TimelineResult: TimelineResult,
  ColumnHeaderResult: ColumnHeaderResult,
  DataProviderResult: DataProviderResult,
  QueryMatchResult: QueryMatchResult,
  DateRangePickerResult: DateRangePickerResult,
  FavoriteTimelineResult: FavoriteTimelineResult,
  FilterTimelineResult: FilterTimelineResult,
  FilterMetaTimelineResult: FilterMetaTimelineResult,
  SerializedFilterQueryResult: SerializedFilterQueryResult,
  SerializedKueryQueryResult: SerializedKueryQueryResult,
  KueryFilterQueryResult: KueryFilterQueryResult,
  SortTimelineResult: SortTimelineResult,
  PageInfoTimeline: PageInfoTimeline,
  SortTimeline: SortTimeline,
  SortFieldTimeline: SortFieldTimeline,
  ResponseTimelines: ResponseTimelines,
  Mutation: {},
  NoteInput: NoteInput,
  ResponseNote: ResponseNote,
  TimelineInput: TimelineInput,
  ColumnHeaderInput: ColumnHeaderInput,
  DataProviderInput: DataProviderInput,
  QueryMatchInput: QueryMatchInput,
  FilterTimelineInput: FilterTimelineInput,
  FilterMetaTimelineInput: FilterMetaTimelineInput,
  SerializedFilterQueryInput: SerializedFilterQueryInput,
  SerializedKueryQueryInput: SerializedKueryQueryInput,
  KueryFilterQueryInput: KueryFilterQueryInput,
  DateRangePickerInput: DateRangePickerInput,
  SortTimelineInput: SortTimelineInput,
  ResponseTimeline: ResponseTimeline,
  ResponseFavoriteTimeline: ResponseFavoriteTimeline,
  EcsEdges: EcsEdges,
  EventsTimelineData: EventsTimelineData,
  FavoriteTimelineInput: FavoriteTimelineInput,
  FlowDirection: FlowDirection,
  HostFields: HostFields,
  OsFields: OsFields,
  NetworkDirectionEcs: NetworkDirectionEcs,
  NetworkHttpFields: NetworkHttpFields,
}>;

export type AnomaliesOverTimeDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AnomaliesOverTimeData'] = ResolversParentTypes['AnomaliesOverTimeData']> = ResolversObject<{
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  anomaliesOverTime?: Resolver<Array<ResolversTypes['MatrixOverTimeHistogramData']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
}>;

export type AuditdDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuditdData'] = ResolversParentTypes['AuditdData']> = ResolversObject<{
  acct?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  terminal?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  op?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type AuditdEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuditdEcsFields'] = ResolversParentTypes['AuditdEcsFields']> = ResolversObject<{
  result?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  session?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  data?: Resolver<Maybe<ResolversTypes['AuditdData']>, ParentType, ContextType>,
  summary?: Resolver<Maybe<ResolversTypes['Summary']>, ParentType, ContextType>,
  sequence?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type AuditEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuditEcsFields'] = ResolversParentTypes['AuditEcsFields']> = ResolversObject<{
  package?: Resolver<Maybe<ResolversTypes['PackageEcsFields']>, ParentType, ContextType>,
}>;

export type AuthEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuthEcsFields'] = ResolversParentTypes['AuthEcsFields']> = ResolversObject<{
  ssh?: Resolver<Maybe<ResolversTypes['SshEcsFields']>, ParentType, ContextType>,
}>;

export type AuthenticationItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuthenticationItem'] = ResolversParentTypes['AuthenticationItem']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  failures?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  successes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  user?: Resolver<ResolversTypes['UserEcsFields'], ParentType, ContextType>,
  lastSuccess?: Resolver<Maybe<ResolversTypes['LastSourceHost']>, ParentType, ContextType>,
  lastFailure?: Resolver<Maybe<ResolversTypes['LastSourceHost']>, ParentType, ContextType>,
}>;

export type AuthenticationsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuthenticationsData'] = ResolversParentTypes['AuthenticationsData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['AuthenticationsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type AuthenticationsEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuthenticationsEdges'] = ResolversParentTypes['AuthenticationsEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['AuthenticationItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type AuthenticationsOverTimeDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AuthenticationsOverTimeData'] = ResolversParentTypes['AuthenticationsOverTimeData']> = ResolversObject<{
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  authenticationsOverTime?: Resolver<Array<ResolversTypes['MatrixOverTimeHistogramData']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
}>;

export type AutonomousSystemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AutonomousSystem'] = ResolversParentTypes['AutonomousSystem']> = ResolversObject<{
  number?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  organization?: Resolver<Maybe<ResolversTypes['AutonomousSystemOrganization']>, ParentType, ContextType>,
}>;

export type AutonomousSystemItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AutonomousSystemItem'] = ResolversParentTypes['AutonomousSystemItem']> = ResolversObject<{
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  number?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type AutonomousSystemOrganizationResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['AutonomousSystemOrganization'] = ResolversParentTypes['AutonomousSystemOrganization']> = ResolversObject<{
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type CloudFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['CloudFields'] = ResolversParentTypes['CloudFields']> = ResolversObject<{
  instance?: Resolver<Maybe<ResolversTypes['CloudInstance']>, ParentType, ContextType>,
  machine?: Resolver<Maybe<ResolversTypes['CloudMachine']>, ParentType, ContextType>,
  provider?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
  region?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
}>;

export type CloudInstanceResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['CloudInstance'] = ResolversParentTypes['CloudInstance']> = ResolversObject<{
  id?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
}>;

export type CloudMachineResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['CloudMachine'] = ResolversParentTypes['CloudMachine']> = ResolversObject<{
  type?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
}>;

export type ColumnHeaderResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ColumnHeaderResult'] = ResolversParentTypes['ColumnHeaderResult']> = ResolversObject<{
  aggregatable?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  columnHeaderType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  example?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  indexes?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  placeholder?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  searchable?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type CursorTypeResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['CursorType'] = ResolversParentTypes['CursorType']> = ResolversObject<{
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  tiebreaker?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type DataProviderResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['DataProviderResult'] = ResolversParentTypes['DataProviderResult']> = ResolversObject<{
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  enabled?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  excluded?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  kqlQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  queryMatch?: Resolver<Maybe<ResolversTypes['QueryMatchResult']>, ParentType, ContextType>,
  and?: Resolver<Maybe<Array<ResolversTypes['DataProviderResult']>>, ParentType, ContextType>,
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date'
}

export type DateRangePickerResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['DateRangePickerResult'] = ResolversParentTypes['DateRangePickerResult']> = ResolversObject<{
  start?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  end?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type DestinationEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['DestinationEcsFields'] = ResolversParentTypes['DestinationEcsFields']> = ResolversObject<{
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  port?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type DetailItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['DetailItem'] = ResolversParentTypes['DetailItem']> = ResolversObject<{
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  values?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  originalValue?: Resolver<Maybe<ResolversTypes['EsValue']>, ParentType, ContextType>,
}>;

export type DnsEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['DnsEcsFields'] = ResolversParentTypes['DnsEcsFields']> = ResolversObject<{
  question?: Resolver<Maybe<ResolversTypes['DnsQuestionData']>, ParentType, ContextType>,
  resolved_ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  response_code?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type DnsQuestionDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['DnsQuestionData'] = ResolversParentTypes['DnsQuestionData']> = ResolversObject<{
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type EcsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ECS'] = ResolversParentTypes['ECS']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  _index?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  auditd?: Resolver<Maybe<ResolversTypes['AuditdEcsFields']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['DestinationEcsFields']>, ParentType, ContextType>,
  dns?: Resolver<Maybe<ResolversTypes['DnsEcsFields']>, ParentType, ContextType>,
  endgame?: Resolver<Maybe<ResolversTypes['EndgameEcsFields']>, ParentType, ContextType>,
  event?: Resolver<Maybe<ResolversTypes['EventEcsFields']>, ParentType, ContextType>,
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  host?: Resolver<Maybe<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
  network?: Resolver<Maybe<ResolversTypes['NetworkEcsField']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['SourceEcsFields']>, ParentType, ContextType>,
  suricata?: Resolver<Maybe<ResolversTypes['SuricataEcsFields']>, ParentType, ContextType>,
  tls?: Resolver<Maybe<ResolversTypes['TlsEcsFields']>, ParentType, ContextType>,
  zeek?: Resolver<Maybe<ResolversTypes['ZeekEcsFields']>, ParentType, ContextType>,
  http?: Resolver<Maybe<ResolversTypes['HttpEcsFields']>, ParentType, ContextType>,
  url?: Resolver<Maybe<ResolversTypes['UrlEcsFields']>, ParentType, ContextType>,
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  user?: Resolver<Maybe<ResolversTypes['UserEcsFields']>, ParentType, ContextType>,
  winlog?: Resolver<Maybe<ResolversTypes['WinlogEcsFields']>, ParentType, ContextType>,
  process?: Resolver<Maybe<ResolversTypes['ProcessEcsFields']>, ParentType, ContextType>,
  file?: Resolver<Maybe<ResolversTypes['FileFields']>, ParentType, ContextType>,
  system?: Resolver<Maybe<ResolversTypes['SystemEcsField']>, ParentType, ContextType>,
}>;

export type EcsEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['EcsEdges'] = ResolversParentTypes['EcsEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['ECS'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type EndgameEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['EndgameEcsFields'] = ResolversParentTypes['EndgameEcsFields']> = ResolversObject<{
  exit_code?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  file_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  file_path?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  logon_type?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  parent_process_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  pid?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  process_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  subject_domain_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  subject_logon_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  subject_user_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  target_domain_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  target_logon_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  target_user_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export interface EsValueScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['EsValue'], any> {
  name: 'EsValue'
}

export type EventEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['EventEcsFields'] = ResolversParentTypes['EventEcsFields']> = ResolversObject<{
  action?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  category?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  code?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  created?: Resolver<Maybe<ResolversTypes['ToDateArray']>, ParentType, ContextType>,
  dataset?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  duration?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  end?: Resolver<Maybe<ResolversTypes['ToDateArray']>, ParentType, ContextType>,
  hash?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  kind?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  module?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  original?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  outcome?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  risk_score?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  risk_score_norm?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  severity?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  start?: Resolver<Maybe<ResolversTypes['ToDateArray']>, ParentType, ContextType>,
  timezone?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type EventsOverTimeDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['EventsOverTimeData'] = ResolversParentTypes['EventsOverTimeData']> = ResolversObject<{
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  eventsOverTime?: Resolver<Array<ResolversTypes['MatrixOverTimeHistogramData']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
}>;

export type EventsTimelineDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['EventsTimelineData'] = ResolversParentTypes['EventsTimelineData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['EcsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type FavoriteTimelineResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['FavoriteTimelineResult'] = ResolversParentTypes['FavoriteTimelineResult']> = ResolversObject<{
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  userName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  favoriteDate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type FileFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['FileFields'] = ResolversParentTypes['FileFields']> = ResolversObject<{
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  path?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  target_path?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  extension?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  device?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  inode?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  uid?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  owner?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  gid?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  group?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  mode?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  size?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  mtime?: Resolver<Maybe<ResolversTypes['ToDateArray']>, ParentType, ContextType>,
  ctime?: Resolver<Maybe<ResolversTypes['ToDateArray']>, ParentType, ContextType>,
}>;

export type FilterMetaTimelineResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['FilterMetaTimelineResult'] = ResolversParentTypes['FilterMetaTimelineResult']> = ResolversObject<{
  alias?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  controlledBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  disabled?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  formattedValue?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  index?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  negate?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  params?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type FilterTimelineResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['FilterTimelineResult'] = ResolversParentTypes['FilterTimelineResult']> = ResolversObject<{
  exists?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  meta?: Resolver<Maybe<ResolversTypes['FilterMetaTimelineResult']>, ParentType, ContextType>,
  match_all?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  missing?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  query?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  range?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  script?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type FingerprintDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['FingerprintData'] = ResolversParentTypes['FingerprintData']> = ResolversObject<{
  sha1?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type FirstLastSeenHostResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['FirstLastSeenHost'] = ResolversParentTypes['FirstLastSeenHost']> = ResolversObject<{
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  firstSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
}>;

export type GeoEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['GeoEcsFields'] = ResolversParentTypes['GeoEcsFields']> = ResolversObject<{
  city_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  continent_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  country_iso_code?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  country_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['Location']>, ParentType, ContextType>,
  region_iso_code?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  region_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type GeoItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['GeoItem'] = ResolversParentTypes['GeoItem']> = ResolversObject<{
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  flowTarget?: Resolver<Maybe<ResolversTypes['FlowTargetSourceDest']>, ParentType, ContextType>,
}>;

export type HostEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HostEcsFields'] = ResolversParentTypes['HostEcsFields']> = ResolversObject<{
  architecture?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  mac?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  os?: Resolver<Maybe<ResolversTypes['OsEcsFields']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type HostFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HostFields'] = ResolversParentTypes['HostFields']> = ResolversObject<{
  architecture?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
  mac?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  os?: Resolver<Maybe<ResolversTypes['OsFields']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type HostItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HostItem'] = ResolversParentTypes['HostItem']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  host?: Resolver<Maybe<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
  cloud?: Resolver<Maybe<ResolversTypes['CloudFields']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type HostsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HostsData'] = ResolversParentTypes['HostsData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['HostsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type HostsEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HostsEdges'] = ResolversParentTypes['HostsEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['HostItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type HttpBodyDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HttpBodyData'] = ResolversParentTypes['HttpBodyData']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type HttpEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HttpEcsFields'] = ResolversParentTypes['HttpEcsFields']> = ResolversObject<{
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  request?: Resolver<Maybe<ResolversTypes['HttpRequestData']>, ParentType, ContextType>,
  response?: Resolver<Maybe<ResolversTypes['HttpResponseData']>, ParentType, ContextType>,
}>;

export type HttpRequestDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HttpRequestData'] = ResolversParentTypes['HttpRequestData']> = ResolversObject<{
  method?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  body?: Resolver<Maybe<ResolversTypes['HttpBodyData']>, ParentType, ContextType>,
  referrer?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type HttpResponseDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['HttpResponseData'] = ResolversParentTypes['HttpResponseData']> = ResolversObject<{
  status_code?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  body?: Resolver<Maybe<ResolversTypes['HttpBodyData']>, ParentType, ContextType>,
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type IndexFieldResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['IndexField'] = ResolversParentTypes['IndexField']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  example?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  indexes?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>,
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  searchable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>,
  aggregatable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>,
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  format?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type InspectResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Inspect'] = ResolversParentTypes['Inspect']> = ResolversObject<{
  dsl?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
  response?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type IpOverviewDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['IpOverviewData'] = ResolversParentTypes['IpOverviewData']> = ResolversObject<{
  client?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  host?: Resolver<ResolversTypes['HostEcsFields'], ParentType, ContextType>,
  server?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type KpiHostDetailsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['KpiHostDetailsData'] = ResolversParentTypes['KpiHostDetailsData']> = ResolversObject<{
  authSuccess?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  authSuccessHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  authFailure?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  authFailureHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  uniqueSourceIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourceIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  uniqueDestinationIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDestinationIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type KpiHostHistogramDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['KpiHostHistogramData'] = ResolversParentTypes['KpiHostHistogramData']> = ResolversObject<{
  x?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  y?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type KpiHostsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['KpiHostsData'] = ResolversParentTypes['KpiHostsData']> = ResolversObject<{
  hosts?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  hostsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  authSuccess?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  authSuccessHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  authFailure?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  authFailureHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  uniqueSourceIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourceIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  uniqueDestinationIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDestinationIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type KpiNetworkDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['KpiNetworkData'] = ResolversParentTypes['KpiNetworkData']> = ResolversObject<{
  networkEvents?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueFlowId?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourcePrivateIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourcePrivateIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiNetworkHistogramData']>>, ParentType, ContextType>,
  uniqueDestinationPrivateIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDestinationPrivateIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiNetworkHistogramData']>>, ParentType, ContextType>,
  dnsQueries?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  tlsHandshakes?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type KpiNetworkHistogramDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['KpiNetworkHistogramData'] = ResolversParentTypes['KpiNetworkHistogramData']> = ResolversObject<{
  x?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  y?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type KueryFilterQueryResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['KueryFilterQueryResult'] = ResolversParentTypes['KueryFilterQueryResult']> = ResolversObject<{
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  expression?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type LastEventTimeDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['LastEventTimeData'] = ResolversParentTypes['LastEventTimeData']> = ResolversObject<{
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type LastSourceHostResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['LastSourceHost'] = ResolversParentTypes['LastSourceHost']> = ResolversObject<{
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['SourceEcsFields']>, ParentType, ContextType>,
  host?: Resolver<Maybe<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
}>;

export type LocationResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = ResolversObject<{
  lon?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  lat?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type MatrixOverOrdinalHistogramDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['MatrixOverOrdinalHistogramData'] = ResolversParentTypes['MatrixOverOrdinalHistogramData']> = ResolversObject<{
  x?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  y?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  g?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
}>;

export type MatrixOverTimeHistogramDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['MatrixOverTimeHistogramData'] = ResolversParentTypes['MatrixOverTimeHistogramData']> = ResolversObject<{
  x?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  y?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  g?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
}>;

export type MutationResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  persistNote?: Resolver<ResolversTypes['ResponseNote'], ParentType, ContextType, RequireFields<MutationPersistNoteArgs, 'note'>>,
  deleteNote?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteNoteArgs, 'id'>>,
  deleteNoteByTimelineId?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteNoteByTimelineIdArgs, 'timelineId'>>,
  persistPinnedEventOnTimeline?: Resolver<Maybe<ResolversTypes['PinnedEvent']>, ParentType, ContextType, RequireFields<MutationPersistPinnedEventOnTimelineArgs, 'eventId'>>,
  deletePinnedEventOnTimeline?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeletePinnedEventOnTimelineArgs, 'id'>>,
  deleteAllPinnedEventsOnTimeline?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteAllPinnedEventsOnTimelineArgs, 'timelineId'>>,
  persistTimeline?: Resolver<ResolversTypes['ResponseTimeline'], ParentType, ContextType, RequireFields<MutationPersistTimelineArgs, 'timeline'>>,
  persistFavorite?: Resolver<ResolversTypes['ResponseFavoriteTimeline'], ParentType, ContextType, MutationPersistFavoriteArgs>,
  deleteTimeline?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteTimelineArgs, 'id'>>,
}>;

export type NetworkDnsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkDnsData'] = ResolversParentTypes['NetworkDnsData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NetworkDnsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  histogram?: Resolver<Maybe<Array<ResolversTypes['MatrixOverOrdinalHistogramData']>>, ParentType, ContextType>,
}>;

export type NetworkDnsEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkDnsEdges'] = ResolversParentTypes['NetworkDnsEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['NetworkDnsItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type NetworkDnsItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkDnsItem'] = ResolversParentTypes['NetworkDnsItem']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  dnsBytesIn?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  dnsBytesOut?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  dnsName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  queryCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDomains?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type NetworkEcsFieldResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkEcsField'] = ResolversParentTypes['NetworkEcsField']> = ResolversObject<{
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  community_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  direction?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  protocol?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  transport?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type NetworkHttpDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkHttpData'] = ResolversParentTypes['NetworkHttpData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NetworkHttpEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type NetworkHttpEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkHttpEdges'] = ResolversParentTypes['NetworkHttpEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['NetworkHttpItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type NetworkHttpItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkHttpItem'] = ResolversParentTypes['NetworkHttpItem']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  domains?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
  lastHost?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  lastSourceIp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  methods?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
  path?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  requestCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  statuses?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type NetworkTopCountriesDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkTopCountriesData'] = ResolversParentTypes['NetworkTopCountriesData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NetworkTopCountriesEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type NetworkTopCountriesEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkTopCountriesEdges'] = ResolversParentTypes['NetworkTopCountriesEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['NetworkTopCountriesItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type NetworkTopCountriesItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkTopCountriesItem'] = ResolversParentTypes['NetworkTopCountriesItem']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['TopCountriesItemSource']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['TopCountriesItemDestination']>, ParentType, ContextType>,
  network?: Resolver<Maybe<ResolversTypes['TopNetworkTablesEcsField']>, ParentType, ContextType>,
}>;

export type NetworkTopNFlowDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkTopNFlowData'] = ResolversParentTypes['NetworkTopNFlowData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NetworkTopNFlowEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type NetworkTopNFlowEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkTopNFlowEdges'] = ResolversParentTypes['NetworkTopNFlowEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['NetworkTopNFlowItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type NetworkTopNFlowItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NetworkTopNFlowItem'] = ResolversParentTypes['NetworkTopNFlowItem']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['TopNFlowItemSource']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['TopNFlowItemDestination']>, ParentType, ContextType>,
  network?: Resolver<Maybe<ResolversTypes['TopNetworkTablesEcsField']>, ParentType, ContextType>,
}>;

export type NoteResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['NoteResult'] = ResolversParentTypes['NoteResult']> = ResolversObject<{
  eventId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timelineId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  noteId?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  created?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timelineVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  updated?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  updatedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type OsEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['OsEcsFields'] = ResolversParentTypes['OsEcsFields']> = ResolversObject<{
  platform?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  full?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  family?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  kernel?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type OsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['OsFields'] = ResolversParentTypes['OsFields']> = ResolversObject<{
  platform?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  full?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  family?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  kernel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type OverviewResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Overview'] = ResolversParentTypes['Overview']> = ResolversObject<{
  firstSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  autonomousSystem?: Resolver<ResolversTypes['AutonomousSystem'], ParentType, ContextType>,
  geo?: Resolver<ResolversTypes['GeoEcsFields'], ParentType, ContextType>,
}>;

export type OverviewHostDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['OverviewHostData'] = ResolversParentTypes['OverviewHostData']> = ResolversObject<{
  auditbeatAuditd?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatFIM?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatLogin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatPackage?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatProcess?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatUser?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameDns?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameFile?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameImageLoad?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameNetwork?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameProcess?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameRegistry?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  endgameSecurity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatSystemModule?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  winlogbeat?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type OverviewNetworkDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['OverviewNetworkData'] = ResolversParentTypes['OverviewNetworkData']> = ResolversObject<{
  auditbeatSocket?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatCisco?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatNetflow?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatPanw?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatSuricata?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatZeek?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  packetbeatDNS?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  packetbeatFlow?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  packetbeatTLS?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type PackageEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['PackageEcsFields'] = ResolversParentTypes['PackageEcsFields']> = ResolversObject<{
  arch?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  entity_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  size?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  summary?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type PageInfoResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['CursorType']>, ParentType, ContextType>,
  hasNextPage?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
}>;

export type PageInfoPaginatedResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['PageInfoPaginated'] = ResolversParentTypes['PageInfoPaginated']> = ResolversObject<{
  activePage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  fakeTotalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  showMorePagesIndicator?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>,
}>;

export type PinnedEventResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['PinnedEvent'] = ResolversParentTypes['PinnedEvent']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  pinnedEventId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>,
  eventId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>,
  timelineId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>,
  timelineVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  created?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  updated?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  updatedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type PrimarySecondaryResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['PrimarySecondary'] = ResolversParentTypes['PrimarySecondary']> = ResolversObject<{
  primary?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  secondary?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type ProcessEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ProcessEcsFields'] = ResolversParentTypes['ProcessEcsFields']> = ResolversObject<{
  hash?: Resolver<Maybe<ResolversTypes['ProcessHashData']>, ParentType, ContextType>,
  pid?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  ppid?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  args?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  executable?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  title?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  thread?: Resolver<Maybe<ResolversTypes['Thread']>, ParentType, ContextType>,
  working_directory?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type ProcessHashDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ProcessHashData'] = ResolversParentTypes['ProcessHashData']> = ResolversObject<{
  md5?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  sha1?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  sha256?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type QueryResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  getNote?: Resolver<ResolversTypes['NoteResult'], ParentType, ContextType, RequireFields<QueryGetNoteArgs, 'id'>>,
  getNotesByTimelineId?: Resolver<Array<ResolversTypes['NoteResult']>, ParentType, ContextType, RequireFields<QueryGetNotesByTimelineIdArgs, 'timelineId'>>,
  getNotesByEventId?: Resolver<Array<ResolversTypes['NoteResult']>, ParentType, ContextType, RequireFields<QueryGetNotesByEventIdArgs, 'eventId'>>,
  getAllNotes?: Resolver<ResolversTypes['ResponseNotes'], ParentType, ContextType, QueryGetAllNotesArgs>,
  getAllPinnedEventsByTimelineId?: Resolver<Array<ResolversTypes['PinnedEvent']>, ParentType, ContextType, RequireFields<QueryGetAllPinnedEventsByTimelineIdArgs, 'timelineId'>>,
  source?: Resolver<ResolversTypes['Source'], ParentType, ContextType, RequireFields<QuerySourceArgs, 'id'>>,
  allSources?: Resolver<Array<ResolversTypes['Source']>, ParentType, ContextType>,
  getOneTimeline?: Resolver<ResolversTypes['TimelineResult'], ParentType, ContextType, RequireFields<QueryGetOneTimelineArgs, 'id'>>,
  getAllTimeline?: Resolver<ResolversTypes['ResponseTimelines'], ParentType, ContextType, QueryGetAllTimelineArgs>,
}>;

export type QueryMatchResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['QueryMatchResult'] = ResolversParentTypes['QueryMatchResult']> = ResolversObject<{
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  displayField?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  displayValue?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  operator?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type ResponseFavoriteTimelineResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ResponseFavoriteTimeline'] = ResolversParentTypes['ResponseFavoriteTimeline']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  savedObjectId?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  favorite?: Resolver<Maybe<Array<ResolversTypes['FavoriteTimelineResult']>>, ParentType, ContextType>,
}>;

export type ResponseNoteResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ResponseNote'] = ResolversParentTypes['ResponseNote']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  note?: Resolver<ResolversTypes['NoteResult'], ParentType, ContextType>,
}>;

export type ResponseNotesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ResponseNotes'] = ResolversParentTypes['ResponseNotes']> = ResolversObject<{
  notes?: Resolver<Array<ResolversTypes['NoteResult']>, ParentType, ContextType>,
  totalCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type ResponseTimelineResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ResponseTimeline'] = ResolversParentTypes['ResponseTimeline']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timeline?: Resolver<ResolversTypes['TimelineResult'], ParentType, ContextType>,
}>;

export type ResponseTimelinesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ResponseTimelines'] = ResolversParentTypes['ResponseTimelines']> = ResolversObject<{
  timeline?: Resolver<Array<Maybe<ResolversTypes['TimelineResult']>>, ParentType, ContextType>,
  totalCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type SayMyNameResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SayMyName'] = ResolversParentTypes['SayMyName']> = ResolversObject<{
  appName?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
}>;

export type SerializedFilterQueryResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SerializedFilterQueryResult'] = ResolversParentTypes['SerializedFilterQueryResult']> = ResolversObject<{
  filterQuery?: Resolver<Maybe<ResolversTypes['SerializedKueryQueryResult']>, ParentType, ContextType>,
}>;

export type SerializedKueryQueryResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SerializedKueryQueryResult'] = ResolversParentTypes['SerializedKueryQueryResult']> = ResolversObject<{
  kuery?: Resolver<Maybe<ResolversTypes['KueryFilterQueryResult']>, ParentType, ContextType>,
  serializedQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type SortTimelineResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SortTimelineResult'] = ResolversParentTypes['SortTimelineResult']> = ResolversObject<{
  columnId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  sortDirection?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
}>;

export type SourceResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Source'] = ResolversParentTypes['Source']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>,
  configuration?: Resolver<ResolversTypes['SourceConfiguration'], ParentType, ContextType>,
  status?: Resolver<ResolversTypes['SourceStatus'], ParentType, ContextType>,
  AnomaliesOverTime?: Resolver<ResolversTypes['AnomaliesOverTimeData'], ParentType, ContextType, RequireFields<SourceAnomaliesOverTimeArgs, 'timerange' | 'defaultIndex'>>,
  Authentications?: Resolver<ResolversTypes['AuthenticationsData'], ParentType, ContextType, RequireFields<SourceAuthenticationsArgs, 'timerange' | 'pagination' | 'defaultIndex'>>,
  AuthenticationsOverTime?: Resolver<ResolversTypes['AuthenticationsOverTimeData'], ParentType, ContextType, RequireFields<SourceAuthenticationsOverTimeArgs, 'timerange' | 'defaultIndex'>>,
  Timeline?: Resolver<ResolversTypes['TimelineData'], ParentType, ContextType, RequireFields<SourceTimelineArgs, 'pagination' | 'sortField' | 'fieldRequested' | 'defaultIndex'>>,
  TimelineDetails?: Resolver<ResolversTypes['TimelineDetailsData'], ParentType, ContextType, RequireFields<SourceTimelineDetailsArgs, 'eventId' | 'indexName' | 'defaultIndex'>>,
  LastEventTime?: Resolver<ResolversTypes['LastEventTimeData'], ParentType, ContextType, RequireFields<SourceLastEventTimeArgs, 'indexKey' | 'details' | 'defaultIndex'>>,
  EventsOverTime?: Resolver<ResolversTypes['EventsOverTimeData'], ParentType, ContextType, RequireFields<SourceEventsOverTimeArgs, 'timerange' | 'defaultIndex'>>,
  Hosts?: Resolver<ResolversTypes['HostsData'], ParentType, ContextType, RequireFields<SourceHostsArgs, 'timerange' | 'pagination' | 'sort' | 'defaultIndex'>>,
  HostOverview?: Resolver<ResolversTypes['HostItem'], ParentType, ContextType, RequireFields<SourceHostOverviewArgs, 'hostName' | 'timerange' | 'defaultIndex'>>,
  HostFirstLastSeen?: Resolver<ResolversTypes['FirstLastSeenHost'], ParentType, ContextType, RequireFields<SourceHostFirstLastSeenArgs, 'hostName' | 'defaultIndex'>>,
  IpOverview?: Resolver<Maybe<ResolversTypes['IpOverviewData']>, ParentType, ContextType, RequireFields<SourceIpOverviewArgs, 'ip' | 'defaultIndex'>>,
  Users?: Resolver<ResolversTypes['UsersData'], ParentType, ContextType, RequireFields<SourceUsersArgs, 'ip' | 'pagination' | 'sort' | 'flowTarget' | 'timerange' | 'defaultIndex'>>,
  KpiNetwork?: Resolver<Maybe<ResolversTypes['KpiNetworkData']>, ParentType, ContextType, RequireFields<SourceKpiNetworkArgs, 'timerange' | 'defaultIndex'>>,
  KpiHosts?: Resolver<ResolversTypes['KpiHostsData'], ParentType, ContextType, RequireFields<SourceKpiHostsArgs, 'timerange' | 'defaultIndex'>>,
  KpiHostDetails?: Resolver<ResolversTypes['KpiHostDetailsData'], ParentType, ContextType, RequireFields<SourceKpiHostDetailsArgs, 'timerange' | 'defaultIndex'>>,
  NetworkTopCountries?: Resolver<ResolversTypes['NetworkTopCountriesData'], ParentType, ContextType, RequireFields<SourceNetworkTopCountriesArgs, 'flowTarget' | 'pagination' | 'sort' | 'timerange' | 'defaultIndex'>>,
  NetworkTopNFlow?: Resolver<ResolversTypes['NetworkTopNFlowData'], ParentType, ContextType, RequireFields<SourceNetworkTopNFlowArgs, 'flowTarget' | 'pagination' | 'sort' | 'timerange' | 'defaultIndex'>>,
  NetworkDns?: Resolver<ResolversTypes['NetworkDnsData'], ParentType, ContextType, RequireFields<SourceNetworkDnsArgs, 'isPtrIncluded' | 'pagination' | 'sort' | 'timerange' | 'defaultIndex'>>,
  NetworkHttp?: Resolver<ResolversTypes['NetworkHttpData'], ParentType, ContextType, RequireFields<SourceNetworkHttpArgs, 'pagination' | 'sort' | 'timerange' | 'defaultIndex'>>,
  OverviewNetwork?: Resolver<Maybe<ResolversTypes['OverviewNetworkData']>, ParentType, ContextType, RequireFields<SourceOverviewNetworkArgs, 'timerange' | 'defaultIndex'>>,
  OverviewHost?: Resolver<Maybe<ResolversTypes['OverviewHostData']>, ParentType, ContextType, RequireFields<SourceOverviewHostArgs, 'timerange' | 'defaultIndex'>>,
  Tls?: Resolver<ResolversTypes['TlsData'], ParentType, ContextType, RequireFields<SourceTlsArgs, 'ip' | 'pagination' | 'sort' | 'flowTarget' | 'timerange' | 'defaultIndex'>>,
  UncommonProcesses?: Resolver<ResolversTypes['UncommonProcessesData'], ParentType, ContextType, RequireFields<SourceUncommonProcessesArgs, 'timerange' | 'pagination' | 'defaultIndex'>>,
  whoAmI?: Resolver<Maybe<ResolversTypes['SayMyName']>, ParentType, ContextType>,
}>;

export type SourceConfigurationResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SourceConfiguration'] = ResolversParentTypes['SourceConfiguration']> = ResolversObject<{
  fields?: Resolver<ResolversTypes['SourceFields'], ParentType, ContextType>,
}>;

export type SourceEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SourceEcsFields'] = ResolversParentTypes['SourceEcsFields']> = ResolversObject<{
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  port?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type SourceFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SourceFields'] = ResolversParentTypes['SourceFields']> = ResolversObject<{
  container?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  host?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  message?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
  pod?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  tiebreaker?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
}>;

export type SourceStatusResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SourceStatus'] = ResolversParentTypes['SourceStatus']> = ResolversObject<{
  indicesExist?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<SourceStatusIndicesExistArgs, 'defaultIndex'>>,
  indexFields?: Resolver<Array<ResolversTypes['IndexField']>, ParentType, ContextType, RequireFields<SourceStatusIndexFieldsArgs, 'defaultIndex'>>,
}>;

export type SshEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SshEcsFields'] = ResolversParentTypes['SshEcsFields']> = ResolversObject<{
  method?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  signature?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type SummaryResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Summary'] = ResolversParentTypes['Summary']> = ResolversObject<{
  actor?: Resolver<Maybe<ResolversTypes['PrimarySecondary']>, ParentType, ContextType>,
  object?: Resolver<Maybe<ResolversTypes['PrimarySecondary']>, ParentType, ContextType>,
  how?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  message_type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  sequence?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type SuricataAlertDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SuricataAlertData'] = ResolversParentTypes['SuricataAlertData']> = ResolversObject<{
  signature?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  signature_id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type SuricataEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SuricataEcsFields'] = ResolversParentTypes['SuricataEcsFields']> = ResolversObject<{
  eve?: Resolver<Maybe<ResolversTypes['SuricataEveData']>, ParentType, ContextType>,
}>;

export type SuricataEveDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SuricataEveData'] = ResolversParentTypes['SuricataEveData']> = ResolversObject<{
  alert?: Resolver<Maybe<ResolversTypes['SuricataAlertData']>, ParentType, ContextType>,
  flow_id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  proto?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type SystemEcsFieldResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['SystemEcsField'] = ResolversParentTypes['SystemEcsField']> = ResolversObject<{
  audit?: Resolver<Maybe<ResolversTypes['AuditEcsFields']>, ParentType, ContextType>,
  auth?: Resolver<Maybe<ResolversTypes['AuthEcsFields']>, ParentType, ContextType>,
}>;

export type ThreadResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['Thread'] = ResolversParentTypes['Thread']> = ResolversObject<{
  id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  start?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type TimelineDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TimelineData'] = ResolversParentTypes['TimelineData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['TimelineEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type TimelineDetailsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TimelineDetailsData'] = ResolversParentTypes['TimelineDetailsData']> = ResolversObject<{
  data?: Resolver<Maybe<Array<ResolversTypes['DetailItem']>>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type TimelineEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TimelineEdges'] = ResolversParentTypes['TimelineEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['TimelineItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type TimelineItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TimelineItem'] = ResolversParentTypes['TimelineItem']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  _index?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  data?: Resolver<Array<ResolversTypes['TimelineNonEcsData']>, ParentType, ContextType>,
  ecs?: Resolver<ResolversTypes['ECS'], ParentType, ContextType>,
}>;

export type TimelineNonEcsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TimelineNonEcsData'] = ResolversParentTypes['TimelineNonEcsData']> = ResolversObject<{
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  value?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type TimelineResultResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TimelineResult'] = ResolversParentTypes['TimelineResult']> = ResolversObject<{
  columns?: Resolver<Maybe<Array<ResolversTypes['ColumnHeaderResult']>>, ParentType, ContextType>,
  created?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  dataProviders?: Resolver<Maybe<Array<ResolversTypes['DataProviderResult']>>, ParentType, ContextType>,
  dateRange?: Resolver<Maybe<ResolversTypes['DateRangePickerResult']>, ParentType, ContextType>,
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  eventIdToNoteIds?: Resolver<Maybe<Array<ResolversTypes['NoteResult']>>, ParentType, ContextType>,
  favorite?: Resolver<Maybe<Array<ResolversTypes['FavoriteTimelineResult']>>, ParentType, ContextType>,
  filters?: Resolver<Maybe<Array<ResolversTypes['FilterTimelineResult']>>, ParentType, ContextType>,
  kqlMode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  kqlQuery?: Resolver<Maybe<ResolversTypes['SerializedFilterQueryResult']>, ParentType, ContextType>,
  notes?: Resolver<Maybe<Array<ResolversTypes['NoteResult']>>, ParentType, ContextType>,
  noteIds?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  pinnedEventIds?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  pinnedEventsSaveObject?: Resolver<Maybe<Array<ResolversTypes['PinnedEvent']>>, ParentType, ContextType>,
  savedQueryId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  savedObjectId?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  sort?: Resolver<Maybe<ResolversTypes['SortTimelineResult']>, ParentType, ContextType>,
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  updated?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  updatedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
}>;

export type TlsClientCertificateDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsClientCertificateData'] = ResolversParentTypes['TlsClientCertificateData']> = ResolversObject<{
  fingerprint?: Resolver<Maybe<ResolversTypes['FingerprintData']>, ParentType, ContextType>,
}>;

export type TlsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsData'] = ResolversParentTypes['TlsData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['TlsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type TlsEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsEcsFields'] = ResolversParentTypes['TlsEcsFields']> = ResolversObject<{
  client_certificate?: Resolver<Maybe<ResolversTypes['TlsClientCertificateData']>, ParentType, ContextType>,
  fingerprints?: Resolver<Maybe<ResolversTypes['TlsFingerprintsData']>, ParentType, ContextType>,
  server_certificate?: Resolver<Maybe<ResolversTypes['TlsServerCertificateData']>, ParentType, ContextType>,
}>;

export type TlsEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsEdges'] = ResolversParentTypes['TlsEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['TlsNode'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type TlsFingerprintsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsFingerprintsData'] = ResolversParentTypes['TlsFingerprintsData']> = ResolversObject<{
  ja3?: Resolver<Maybe<ResolversTypes['TlsJa3Data']>, ParentType, ContextType>,
}>;

export type TlsJa3DataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsJa3Data'] = ResolversParentTypes['TlsJa3Data']> = ResolversObject<{
  hash?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type TlsNodeResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsNode'] = ResolversParentTypes['TlsNode']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  alternativeNames?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  notAfter?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  commonNames?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  ja3?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  issuerNames?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
}>;

export type TlsServerCertificateDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TlsServerCertificateData'] = ResolversParentTypes['TlsServerCertificateData']> = ResolversObject<{
  fingerprint?: Resolver<Maybe<ResolversTypes['FingerprintData']>, ParentType, ContextType>,
}>;

export interface ToBooleanArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToBooleanArray'], any> {
  name: 'ToBooleanArray'
}

export interface ToDateArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToDateArray'], any> {
  name: 'ToDateArray'
}

export interface ToNumberArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToNumberArray'], any> {
  name: 'ToNumberArray'
}

export type TopCountriesItemDestinationResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TopCountriesItemDestination'] = ResolversParentTypes['TopCountriesItemDestination']> = ResolversObject<{
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  destination_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  flows?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['GeoItem']>, ParentType, ContextType>,
  source_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type TopCountriesItemSourceResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TopCountriesItemSource'] = ResolversParentTypes['TopCountriesItemSource']> = ResolversObject<{
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  destination_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  flows?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['GeoItem']>, ParentType, ContextType>,
  source_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type TopNetworkTablesEcsFieldResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TopNetworkTablesEcsField'] = ResolversParentTypes['TopNetworkTablesEcsField']> = ResolversObject<{
  bytes_in?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  bytes_out?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type TopNFlowItemDestinationResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TopNFlowItemDestination'] = ResolversParentTypes['TopNFlowItemDestination']> = ResolversObject<{
  autonomous_system?: Resolver<Maybe<ResolversTypes['AutonomousSystemItem']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['GeoItem']>, ParentType, ContextType>,
  flows?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  source_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type TopNFlowItemSourceResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['TopNFlowItemSource'] = ResolversParentTypes['TopNFlowItemSource']> = ResolversObject<{
  autonomous_system?: Resolver<Maybe<ResolversTypes['AutonomousSystemItem']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['GeoItem']>, ParentType, ContextType>,
  flows?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  destination_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export interface ToStringArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToStringArray'], any> {
  name: 'ToStringArray'
}

export type UncommonProcessesDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UncommonProcessesData'] = ResolversParentTypes['UncommonProcessesData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['UncommonProcessesEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type UncommonProcessesEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UncommonProcessesEdges'] = ResolversParentTypes['UncommonProcessesEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['UncommonProcessItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type UncommonProcessItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UncommonProcessItem'] = ResolversParentTypes['UncommonProcessItem']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  instances?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  process?: Resolver<ResolversTypes['ProcessEcsFields'], ParentType, ContextType>,
  hosts?: Resolver<Array<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
  user?: Resolver<Maybe<ResolversTypes['UserEcsFields']>, ParentType, ContextType>,
}>;

export type UrlEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UrlEcsFields'] = ResolversParentTypes['UrlEcsFields']> = ResolversObject<{
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  original?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  username?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  password?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type UserEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UserEcsFields'] = ResolversParentTypes['UserEcsFields']> = ResolversObject<{
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  full_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  email?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  hash?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  group?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type UsersDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UsersData'] = ResolversParentTypes['UsersData']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['UsersEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
}>;

export type UsersEdgesResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UsersEdges'] = ResolversParentTypes['UsersEdges']> = ResolversObject<{
  node?: Resolver<ResolversTypes['UsersNode'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
}>;

export type UsersItemResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UsersItem'] = ResolversParentTypes['UsersItem']> = ResolversObject<{
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  groupId?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  groupName?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  count?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
}>;

export type UsersNodeResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['UsersNode'] = ResolversParentTypes['UsersNode']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  user?: Resolver<Maybe<ResolversTypes['UsersItem']>, ParentType, ContextType>,
}>;

export type WinlogEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['WinlogEcsFields'] = ResolversParentTypes['WinlogEcsFields']> = ResolversObject<{
  event_id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
}>;

export type ZeekConnectionDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekConnectionData'] = ResolversParentTypes['ZeekConnectionData']> = ResolversObject<{
  local_resp?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  local_orig?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  missed_bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  state?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  history?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type ZeekDnsDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekDnsData'] = ResolversParentTypes['ZeekDnsData']> = ResolversObject<{
  AA?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  qclass_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  RD?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  qtype_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  rejected?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  qtype?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  query?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  trans_id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  qclass?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  RA?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  TC?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
}>;

export type ZeekEcsFieldsResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekEcsFields'] = ResolversParentTypes['ZeekEcsFields']> = ResolversObject<{
  session_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  connection?: Resolver<Maybe<ResolversTypes['ZeekConnectionData']>, ParentType, ContextType>,
  notice?: Resolver<Maybe<ResolversTypes['ZeekNoticeData']>, ParentType, ContextType>,
  dns?: Resolver<Maybe<ResolversTypes['ZeekDnsData']>, ParentType, ContextType>,
  http?: Resolver<Maybe<ResolversTypes['ZeekHttpData']>, ParentType, ContextType>,
  files?: Resolver<Maybe<ResolversTypes['ZeekFileData']>, ParentType, ContextType>,
  ssl?: Resolver<Maybe<ResolversTypes['ZeekSslData']>, ParentType, ContextType>,
}>;

export type ZeekFileDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekFileData'] = ResolversParentTypes['ZeekFileData']> = ResolversObject<{
  session_ids?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  timedout?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  local_orig?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  tx_host?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  is_orig?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  overflow_bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  sha1?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  duration?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  depth?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  analyzers?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  mime_type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  rx_host?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  total_bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  fuid?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  seen_bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  missing_bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  md5?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type ZeekHttpDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekHttpData'] = ResolversParentTypes['ZeekHttpData']> = ResolversObject<{
  resp_mime_types?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  trans_depth?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  status_msg?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  resp_fuids?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  tags?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type ZeekNoticeDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekNoticeData'] = ResolversParentTypes['ZeekNoticeData']> = ResolversObject<{
  suppress_for?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  msg?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  note?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  sub?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  dst?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  dropped?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  peer_descr?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type ZeekSslDataResolvers<ContextType = SiemContext, ParentType extends ResolversParentTypes['ZeekSslData'] = ResolversParentTypes['ZeekSslData']> = ResolversObject<{
  cipher?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  established?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  resumed?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
}>;

export type Resolvers<ContextType = SiemContext> = ResolversObject<{
  AnomaliesOverTimeData?: AnomaliesOverTimeDataResolvers<ContextType>,
  AuditdData?: AuditdDataResolvers<ContextType>,
  AuditdEcsFields?: AuditdEcsFieldsResolvers<ContextType>,
  AuditEcsFields?: AuditEcsFieldsResolvers<ContextType>,
  AuthEcsFields?: AuthEcsFieldsResolvers<ContextType>,
  AuthenticationItem?: AuthenticationItemResolvers<ContextType>,
  AuthenticationsData?: AuthenticationsDataResolvers<ContextType>,
  AuthenticationsEdges?: AuthenticationsEdgesResolvers<ContextType>,
  AuthenticationsOverTimeData?: AuthenticationsOverTimeDataResolvers<ContextType>,
  AutonomousSystem?: AutonomousSystemResolvers<ContextType>,
  AutonomousSystemItem?: AutonomousSystemItemResolvers<ContextType>,
  AutonomousSystemOrganization?: AutonomousSystemOrganizationResolvers<ContextType>,
  CloudFields?: CloudFieldsResolvers<ContextType>,
  CloudInstance?: CloudInstanceResolvers<ContextType>,
  CloudMachine?: CloudMachineResolvers<ContextType>,
  ColumnHeaderResult?: ColumnHeaderResultResolvers<ContextType>,
  CursorType?: CursorTypeResolvers<ContextType>,
  DataProviderResult?: DataProviderResultResolvers<ContextType>,
  Date?: GraphQLScalarType,
  DateRangePickerResult?: DateRangePickerResultResolvers<ContextType>,
  DestinationEcsFields?: DestinationEcsFieldsResolvers<ContextType>,
  DetailItem?: DetailItemResolvers<ContextType>,
  DnsEcsFields?: DnsEcsFieldsResolvers<ContextType>,
  DnsQuestionData?: DnsQuestionDataResolvers<ContextType>,
  ECS?: EcsResolvers<ContextType>,
  EcsEdges?: EcsEdgesResolvers<ContextType>,
  EndgameEcsFields?: EndgameEcsFieldsResolvers<ContextType>,
  EsValue?: GraphQLScalarType,
  EventEcsFields?: EventEcsFieldsResolvers<ContextType>,
  EventsOverTimeData?: EventsOverTimeDataResolvers<ContextType>,
  EventsTimelineData?: EventsTimelineDataResolvers<ContextType>,
  FavoriteTimelineResult?: FavoriteTimelineResultResolvers<ContextType>,
  FileFields?: FileFieldsResolvers<ContextType>,
  FilterMetaTimelineResult?: FilterMetaTimelineResultResolvers<ContextType>,
  FilterTimelineResult?: FilterTimelineResultResolvers<ContextType>,
  FingerprintData?: FingerprintDataResolvers<ContextType>,
  FirstLastSeenHost?: FirstLastSeenHostResolvers<ContextType>,
  GeoEcsFields?: GeoEcsFieldsResolvers<ContextType>,
  GeoItem?: GeoItemResolvers<ContextType>,
  HostEcsFields?: HostEcsFieldsResolvers<ContextType>,
  HostFields?: HostFieldsResolvers<ContextType>,
  HostItem?: HostItemResolvers<ContextType>,
  HostsData?: HostsDataResolvers<ContextType>,
  HostsEdges?: HostsEdgesResolvers<ContextType>,
  HttpBodyData?: HttpBodyDataResolvers<ContextType>,
  HttpEcsFields?: HttpEcsFieldsResolvers<ContextType>,
  HttpRequestData?: HttpRequestDataResolvers<ContextType>,
  HttpResponseData?: HttpResponseDataResolvers<ContextType>,
  IndexField?: IndexFieldResolvers<ContextType>,
  Inspect?: InspectResolvers<ContextType>,
  IpOverviewData?: IpOverviewDataResolvers<ContextType>,
  KpiHostDetailsData?: KpiHostDetailsDataResolvers<ContextType>,
  KpiHostHistogramData?: KpiHostHistogramDataResolvers<ContextType>,
  KpiHostsData?: KpiHostsDataResolvers<ContextType>,
  KpiNetworkData?: KpiNetworkDataResolvers<ContextType>,
  KpiNetworkHistogramData?: KpiNetworkHistogramDataResolvers<ContextType>,
  KueryFilterQueryResult?: KueryFilterQueryResultResolvers<ContextType>,
  LastEventTimeData?: LastEventTimeDataResolvers<ContextType>,
  LastSourceHost?: LastSourceHostResolvers<ContextType>,
  Location?: LocationResolvers<ContextType>,
  MatrixOverOrdinalHistogramData?: MatrixOverOrdinalHistogramDataResolvers<ContextType>,
  MatrixOverTimeHistogramData?: MatrixOverTimeHistogramDataResolvers<ContextType>,
  Mutation?: MutationResolvers<ContextType>,
  NetworkDnsData?: NetworkDnsDataResolvers<ContextType>,
  NetworkDnsEdges?: NetworkDnsEdgesResolvers<ContextType>,
  NetworkDnsItem?: NetworkDnsItemResolvers<ContextType>,
  NetworkEcsField?: NetworkEcsFieldResolvers<ContextType>,
  NetworkHttpData?: NetworkHttpDataResolvers<ContextType>,
  NetworkHttpEdges?: NetworkHttpEdgesResolvers<ContextType>,
  NetworkHttpItem?: NetworkHttpItemResolvers<ContextType>,
  NetworkTopCountriesData?: NetworkTopCountriesDataResolvers<ContextType>,
  NetworkTopCountriesEdges?: NetworkTopCountriesEdgesResolvers<ContextType>,
  NetworkTopCountriesItem?: NetworkTopCountriesItemResolvers<ContextType>,
  NetworkTopNFlowData?: NetworkTopNFlowDataResolvers<ContextType>,
  NetworkTopNFlowEdges?: NetworkTopNFlowEdgesResolvers<ContextType>,
  NetworkTopNFlowItem?: NetworkTopNFlowItemResolvers<ContextType>,
  NoteResult?: NoteResultResolvers<ContextType>,
  OsEcsFields?: OsEcsFieldsResolvers<ContextType>,
  OsFields?: OsFieldsResolvers<ContextType>,
  Overview?: OverviewResolvers<ContextType>,
  OverviewHostData?: OverviewHostDataResolvers<ContextType>,
  OverviewNetworkData?: OverviewNetworkDataResolvers<ContextType>,
  PackageEcsFields?: PackageEcsFieldsResolvers<ContextType>,
  PageInfo?: PageInfoResolvers<ContextType>,
  PageInfoPaginated?: PageInfoPaginatedResolvers<ContextType>,
  PinnedEvent?: PinnedEventResolvers<ContextType>,
  PrimarySecondary?: PrimarySecondaryResolvers<ContextType>,
  ProcessEcsFields?: ProcessEcsFieldsResolvers<ContextType>,
  ProcessHashData?: ProcessHashDataResolvers<ContextType>,
  Query?: QueryResolvers<ContextType>,
  QueryMatchResult?: QueryMatchResultResolvers<ContextType>,
  ResponseFavoriteTimeline?: ResponseFavoriteTimelineResolvers<ContextType>,
  ResponseNote?: ResponseNoteResolvers<ContextType>,
  ResponseNotes?: ResponseNotesResolvers<ContextType>,
  ResponseTimeline?: ResponseTimelineResolvers<ContextType>,
  ResponseTimelines?: ResponseTimelinesResolvers<ContextType>,
  SayMyName?: SayMyNameResolvers<ContextType>,
  SerializedFilterQueryResult?: SerializedFilterQueryResultResolvers<ContextType>,
  SerializedKueryQueryResult?: SerializedKueryQueryResultResolvers<ContextType>,
  SortTimelineResult?: SortTimelineResultResolvers<ContextType>,
  Source?: SourceResolvers<ContextType>,
  SourceConfiguration?: SourceConfigurationResolvers<ContextType>,
  SourceEcsFields?: SourceEcsFieldsResolvers<ContextType>,
  SourceFields?: SourceFieldsResolvers<ContextType>,
  SourceStatus?: SourceStatusResolvers<ContextType>,
  SshEcsFields?: SshEcsFieldsResolvers<ContextType>,
  Summary?: SummaryResolvers<ContextType>,
  SuricataAlertData?: SuricataAlertDataResolvers<ContextType>,
  SuricataEcsFields?: SuricataEcsFieldsResolvers<ContextType>,
  SuricataEveData?: SuricataEveDataResolvers<ContextType>,
  SystemEcsField?: SystemEcsFieldResolvers<ContextType>,
  Thread?: ThreadResolvers<ContextType>,
  TimelineData?: TimelineDataResolvers<ContextType>,
  TimelineDetailsData?: TimelineDetailsDataResolvers<ContextType>,
  TimelineEdges?: TimelineEdgesResolvers<ContextType>,
  TimelineItem?: TimelineItemResolvers<ContextType>,
  TimelineNonEcsData?: TimelineNonEcsDataResolvers<ContextType>,
  TimelineResult?: TimelineResultResolvers<ContextType>,
  TlsClientCertificateData?: TlsClientCertificateDataResolvers<ContextType>,
  TlsData?: TlsDataResolvers<ContextType>,
  TlsEcsFields?: TlsEcsFieldsResolvers<ContextType>,
  TlsEdges?: TlsEdgesResolvers<ContextType>,
  TlsFingerprintsData?: TlsFingerprintsDataResolvers<ContextType>,
  TlsJa3Data?: TlsJa3DataResolvers<ContextType>,
  TlsNode?: TlsNodeResolvers<ContextType>,
  TlsServerCertificateData?: TlsServerCertificateDataResolvers<ContextType>,
  ToBooleanArray?: GraphQLScalarType,
  ToDateArray?: GraphQLScalarType,
  ToNumberArray?: GraphQLScalarType,
  TopCountriesItemDestination?: TopCountriesItemDestinationResolvers<ContextType>,
  TopCountriesItemSource?: TopCountriesItemSourceResolvers<ContextType>,
  TopNetworkTablesEcsField?: TopNetworkTablesEcsFieldResolvers<ContextType>,
  TopNFlowItemDestination?: TopNFlowItemDestinationResolvers<ContextType>,
  TopNFlowItemSource?: TopNFlowItemSourceResolvers<ContextType>,
  ToStringArray?: GraphQLScalarType,
  UncommonProcessesData?: UncommonProcessesDataResolvers<ContextType>,
  UncommonProcessesEdges?: UncommonProcessesEdgesResolvers<ContextType>,
  UncommonProcessItem?: UncommonProcessItemResolvers<ContextType>,
  UrlEcsFields?: UrlEcsFieldsResolvers<ContextType>,
  UserEcsFields?: UserEcsFieldsResolvers<ContextType>,
  UsersData?: UsersDataResolvers<ContextType>,
  UsersEdges?: UsersEdgesResolvers<ContextType>,
  UsersItem?: UsersItemResolvers<ContextType>,
  UsersNode?: UsersNodeResolvers<ContextType>,
  WinlogEcsFields?: WinlogEcsFieldsResolvers<ContextType>,
  ZeekConnectionData?: ZeekConnectionDataResolvers<ContextType>,
  ZeekDnsData?: ZeekDnsDataResolvers<ContextType>,
  ZeekEcsFields?: ZeekEcsFieldsResolvers<ContextType>,
  ZeekFileData?: ZeekFileDataResolvers<ContextType>,
  ZeekHttpData?: ZeekHttpDataResolvers<ContextType>,
  ZeekNoticeData?: ZeekNoticeDataResolvers<ContextType>,
  ZeekSslData?: ZeekSslDataResolvers<ContextType>,
}>;


/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
*/
export type IResolvers<ContextType = SiemContext> = Resolvers<ContextType>;
