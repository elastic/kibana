/* tslint:disable */
/* eslint-disable */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SiemContext } from '../lib/types';

export type Maybe<T> = T | null;

export interface PageInfoNote {
  pageIndex: number;

  pageSize: number;
}

export interface SortNote {
  sortField: SortFieldNote;

  sortOrder: Direction;
}

export interface TimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: number;
  /** The beginning of the timerange */
  from: number;
}

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: number;
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: number;
  /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
  fakePossibleCount: number;
  /** The querySize parameter is the number of items to be returned */
  querySize: number;
}

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<string>;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<string>;
}

export interface SortField {
  sortFieldId: string;

  direction: Direction;
}

export interface LastTimeDetails {
  hostName?: Maybe<string>;

  ip?: Maybe<string>;
}

export interface HostsSortField {
  field: HostsFields;

  direction: Direction;
}

export interface DomainsSortField {
  field: DomainsFields;

  direction: Direction;
}

export interface TlsSortField {
  field: TlsFields;

  direction: Direction;
}

export interface UsersSortField {
  field: UsersFields;

  direction: Direction;
}

export interface NetworkTopNFlowSortField {
  field: NetworkTopNFlowFields;

  direction: Direction;
}

export interface NetworkDnsSortField {
  field: NetworkDnsFields;

  direction: Direction;
}

export interface PageInfoTimeline {
  pageIndex: number;

  pageSize: number;
}

export interface SortTimeline {
  sortField: SortFieldTimeline;

  sortOrder: Direction;
}

export interface NoteInput {
  eventId?: Maybe<string>;

  note?: Maybe<string>;

  timelineId?: Maybe<string>;
}

export interface TimelineInput {
  columns?: Maybe<ColumnHeaderInput[]>;

  dataProviders?: Maybe<DataProviderInput[]>;

  description?: Maybe<string>;

  kqlMode?: Maybe<string>;

  kqlQuery?: Maybe<SerializedFilterQueryInput>;

  title?: Maybe<string>;

  dateRange?: Maybe<DateRangePickerInput>;

  sort?: Maybe<SortTimelineInput>;
}

export interface ColumnHeaderInput {
  aggregatable?: Maybe<boolean>;

  category?: Maybe<string>;

  columnHeaderType?: Maybe<string>;

  description?: Maybe<string>;

  example?: Maybe<string>;

  indexes?: Maybe<string[]>;

  id?: Maybe<string>;

  name?: Maybe<string>;

  placeholder?: Maybe<string>;

  searchable?: Maybe<boolean>;

  type?: Maybe<string>;
}

export interface DataProviderInput {
  id?: Maybe<string>;

  name?: Maybe<string>;

  enabled?: Maybe<boolean>;

  excluded?: Maybe<boolean>;

  kqlQuery?: Maybe<string>;

  queryMatch?: Maybe<QueryMatchInput>;

  and?: Maybe<DataProviderInput[]>;
}

export interface QueryMatchInput {
  field?: Maybe<string>;

  displayField?: Maybe<string>;

  value?: Maybe<string>;

  displayValue?: Maybe<string>;

  operator?: Maybe<string>;
}

export interface SerializedFilterQueryInput {
  filterQuery?: Maybe<SerializedKueryQueryInput>;
}

export interface SerializedKueryQueryInput {
  kuery?: Maybe<KueryFilterQueryInput>;

  serializedQuery?: Maybe<string>;
}

export interface KueryFilterQueryInput {
  kind?: Maybe<string>;

  expression?: Maybe<string>;
}

export interface DateRangePickerInput {
  start?: Maybe<number>;

  end?: Maybe<number>;
}

export interface SortTimelineInput {
  columnId?: Maybe<string>;

  sortDirection?: Maybe<string>;
}

export interface FavoriteTimelineInput {
  fullName?: Maybe<string>;

  userName?: Maybe<string>;

  favoriteDate?: Maybe<number>;
}

export enum SortFieldNote {
  updatedBy = 'updatedBy',
  updated = 'updated',
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export enum LastEventIndexKey {
  hostDetails = 'hostDetails',
  hosts = 'hosts',
  ipDetails = 'ipDetails',
  network = 'network',
}

export enum HostsFields {
  hostName = 'hostName',
  lastSeen = 'lastSeen',
}

export enum DomainsFields {
  domainName = 'domainName',
  direction = 'direction',
  bytes = 'bytes',
  packets = 'packets',
  uniqueIpCount = 'uniqueIpCount',
}

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

export enum FlowTarget {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source',
}

export enum NetworkDirectionEcs {
  inbound = 'inbound',
  outbound = 'outbound',
  internal = 'internal',
  external = 'external',
  incoming = 'incoming',
  outgoing = 'outgoing',
  listening = 'listening',
  unknown = 'unknown',
}

export enum TlsFields {
  _id = '_id',
}

export enum UsersFields {
  name = 'name',
  count = 'count',
}

export enum FlowTargetNew {
  destination = 'destination',
  source = 'source',
}

export enum NetworkTopNFlowFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips',
}

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut',
}

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created',
}

export type ToStringArray = string[];

export type Date = string;

export type ToNumberArray = number[];

export type ToDateArray = string[];

export type ToBooleanArray = boolean[];

export type EsValue = any;

// ====================================================
// Scalars
// ====================================================

// ====================================================
// Types
// ====================================================

export interface Query {
  getNote: NoteResult;

  getNotesByTimelineId: NoteResult[];

  getNotesByEventId: NoteResult[];

  getAllNotes: ResponseNotes;

  getAllPinnedEventsByTimelineId: PinnedEvent[];
  /** Get a security data source by id */
  source: Source;
  /** Get a list of all security data sources */
  allSources: Source[];

  getOneTimeline: TimelineResult;

  getAllTimeline: ResponseTimelines;
}

export interface NoteResult {
  eventId?: Maybe<string>;

  note?: Maybe<string>;

  timelineId?: Maybe<string>;

  noteId: string;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}

export interface ResponseNotes {
  notes: NoteResult[];

  totalCount?: Maybe<number>;
}

export interface PinnedEvent {
  code?: Maybe<number>;

  message?: Maybe<string>;

  pinnedEventId: string;

  eventId?: Maybe<string>;

  timelineId?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}

export interface Source {
  /** The id of the source */
  id: string;
  /** The raw configuration of the source */
  configuration: SourceConfiguration;
  /** The status of the source */
  status: SourceStatus;
  /** Gets Authentication success and failures based on a timerange */
  Authentications: AuthenticationsData;

  Timeline: TimelineData;

  TimelineDetails: TimelineDetailsData;

  LastEventTime: LastEventTimeData;

  EventsOverTime: EventsOverTimeData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;

  HostOverview: HostItem;

  HostFirstLastSeen: FirstLastSeenHost;

  IpOverview?: Maybe<IpOverviewData>;

  Domains: DomainsData;

  Tls: TlsData;

  Users: UsersData;

  KpiNetwork?: Maybe<KpiNetworkData>;

  KpiHosts: KpiHostsData;

  KpiHostDetails: KpiHostDetailsData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  NetworkTopNFlow: NetworkTopNFlowData;

  NetworkDns: NetworkDnsData;

  OverviewNetwork?: Maybe<OverviewNetworkData>;

  OverviewHost?: Maybe<OverviewHostData>;
  /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
  UncommonProcesses: UncommonProcessesData;
  /** Just a simple example to get the app name */
  whoAmI?: Maybe<SayMyName>;
}

/** A set of configuration options for a security data source */
export interface SourceConfiguration {
  /** The field mapping to use for this source */
  fields: SourceFields;
}

/** A mapping of semantic fields to their document counterparts */
export interface SourceFields {
  /** The field to identify a container by */
  container: string;
  /** The fields to identify a host by */
  host: string;
  /** The fields that may contain the log event message. The first field found win. */
  message: string[];
  /** The field to identify a pod by */
  pod: string;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker: string;
  /** The field to use as a timestamp for metrics and logs */
  timestamp: string;
}

/** The status of an infrastructure data source */
export interface SourceStatus {
  /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
  indicesExist: boolean;
  /** The list of fields defined in the index mappings */
  indexFields: IndexField[];
}

/** A descriptor of a field in an index */
export interface IndexField {
  /** Where the field belong */
  category: string;
  /** Example of field's value */
  example?: Maybe<string>;
  /** whether the field's belong to an alias index */
  indexes: (Maybe<string>)[];
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
  /** Description of the field */
  description?: Maybe<string>;

  format?: Maybe<string>;
}

export interface AuthenticationsData {
  edges: AuthenticationsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface AuthenticationsEdges {
  node: AuthenticationItem;

  cursor: CursorType;
}

export interface AuthenticationItem {
  _id: string;

  failures: number;

  successes: number;

  user: UserEcsFields;

  lastSuccess?: Maybe<LastSourceHost>;

  lastFailure?: Maybe<LastSourceHost>;
}

export interface UserEcsFields {
  id?: Maybe<string[]>;

  name?: Maybe<string[]>;

  full_name?: Maybe<string[]>;

  email?: Maybe<string[]>;

  hash?: Maybe<string[]>;

  group?: Maybe<string[]>;
}

export interface LastSourceHost {
  timestamp?: Maybe<string>;

  source?: Maybe<SourceEcsFields>;

  host?: Maybe<HostEcsFields>;
}

export interface SourceEcsFields {
  bytes?: Maybe<number[]>;

  ip?: Maybe<string[]>;

  port?: Maybe<number[]>;

  domain?: Maybe<string[]>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[]>;
}

export interface GeoEcsFields {
  city_name?: Maybe<string[]>;

  continent_name?: Maybe<string[]>;

  country_iso_code?: Maybe<string[]>;

  country_name?: Maybe<string[]>;

  location?: Maybe<Location>;

  region_iso_code?: Maybe<string[]>;

  region_name?: Maybe<string[]>;
}

export interface Location {
  lon?: Maybe<number[]>;

  lat?: Maybe<number[]>;
}

export interface HostEcsFields {
  architecture?: Maybe<string[]>;

  id?: Maybe<string[]>;

  ip?: Maybe<string[]>;

  mac?: Maybe<string[]>;

  name?: Maybe<string[]>;

  os?: Maybe<OsEcsFields>;

  type?: Maybe<string[]>;
}

export interface OsEcsFields {
  platform?: Maybe<string[]>;

  name?: Maybe<string[]>;

  full?: Maybe<string[]>;

  family?: Maybe<string[]>;

  version?: Maybe<string[]>;

  kernel?: Maybe<string[]>;
}

export interface CursorType {
  value?: Maybe<string>;

  tiebreaker?: Maybe<string>;
}

export interface PageInfoPaginated {
  activePage: number;

  fakeTotalCount: number;

  showMorePagesIndicator: boolean;
}

export interface Inspect {
  dsl: string[];

  response: string[];
}

export interface TimelineData {
  edges: TimelineEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Maybe<Inspect>;
}

export interface TimelineEdges {
  node: TimelineItem;

  cursor: CursorType;
}

export interface TimelineItem {
  _id: string;

  _index?: Maybe<string>;

  data: TimelineNonEcsData[];

  ecs: ECS;
}

export interface TimelineNonEcsData {
  field: string;

  value?: Maybe<string[]>;
}

export interface ECS {
  _id: string;

  _index?: Maybe<string>;

  auditd?: Maybe<AuditdEcsFields>;

  destination?: Maybe<DestinationEcsFields>;

  event?: Maybe<EventEcsFields>;

  geo?: Maybe<GeoEcsFields>;

  host?: Maybe<HostEcsFields>;

  network?: Maybe<NetworkEcsField>;

  source?: Maybe<SourceEcsFields>;

  suricata?: Maybe<SuricataEcsFields>;

  tls?: Maybe<TlsEcsFields>;

  zeek?: Maybe<ZeekEcsFields>;

  http?: Maybe<HttpEcsFields>;

  url?: Maybe<UrlEcsFields>;

  timestamp?: Maybe<string>;

  message?: Maybe<string[]>;

  user?: Maybe<UserEcsFields>;

  process?: Maybe<ProcessEcsFields>;

  file?: Maybe<FileFields>;

  system?: Maybe<SystemEcsField>;
}

export interface AuditdEcsFields {
  result?: Maybe<string[]>;

  session?: Maybe<string[]>;

  data?: Maybe<AuditdData>;

  summary?: Maybe<Summary>;

  sequence?: Maybe<string[]>;
}

export interface AuditdData {
  acct?: Maybe<string[]>;

  terminal?: Maybe<string[]>;

  op?: Maybe<string[]>;
}

export interface Summary {
  actor?: Maybe<PrimarySecondary>;

  object?: Maybe<PrimarySecondary>;

  how?: Maybe<string[]>;

  message_type?: Maybe<string[]>;

  sequence?: Maybe<string[]>;
}

export interface PrimarySecondary {
  primary?: Maybe<string[]>;

  secondary?: Maybe<string[]>;

  type?: Maybe<string[]>;
}

export interface DestinationEcsFields {
  bytes?: Maybe<number[]>;

  ip?: Maybe<string[]>;

  port?: Maybe<number[]>;

  domain?: Maybe<string[]>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[]>;
}

export interface EventEcsFields {
  action?: Maybe<string[]>;

  category?: Maybe<string[]>;

  created?: Maybe<string[]>;

  dataset?: Maybe<string[]>;

  duration?: Maybe<number[]>;

  end?: Maybe<string[]>;

  hash?: Maybe<string[]>;

  id?: Maybe<string[]>;

  kind?: Maybe<string[]>;

  module?: Maybe<string[]>;

  original?: Maybe<string[]>;

  outcome?: Maybe<string[]>;

  risk_score?: Maybe<number[]>;

  risk_score_norm?: Maybe<number[]>;

  severity?: Maybe<number[]>;

  start?: Maybe<string[]>;

  timezone?: Maybe<string[]>;

  type?: Maybe<string[]>;
}

export interface NetworkEcsField {
  bytes?: Maybe<number[]>;

  community_id?: Maybe<string[]>;

  direction?: Maybe<string[]>;

  packets?: Maybe<number[]>;

  protocol?: Maybe<string[]>;

  transport?: Maybe<string[]>;
}

export interface SuricataEcsFields {
  eve?: Maybe<SuricataEveData>;
}

export interface SuricataEveData {
  alert?: Maybe<SuricataAlertData>;

  flow_id?: Maybe<number[]>;

  proto?: Maybe<string[]>;
}

export interface SuricataAlertData {
  signature?: Maybe<string[]>;

  signature_id?: Maybe<number[]>;
}

export interface TlsEcsFields {
  client_certificate?: Maybe<TlsClientCertificateData>;

  fingerprints?: Maybe<TlsFingerprintsData>;

  server_certificate?: Maybe<TlsServerCertificateData>;
}

export interface TlsClientCertificateData {
  fingerprint?: Maybe<FingerprintData>;
}

export interface FingerprintData {
  sha1?: Maybe<string[]>;
}

export interface TlsFingerprintsData {
  ja3?: Maybe<TlsJa3Data>;
}

export interface TlsJa3Data {
  hash?: Maybe<string[]>;
}

export interface TlsServerCertificateData {
  fingerprint?: Maybe<FingerprintData>;
}

export interface ZeekEcsFields {
  session_id?: Maybe<string[]>;

  connection?: Maybe<ZeekConnectionData>;

  notice?: Maybe<ZeekNoticeData>;

  dns?: Maybe<ZeekDnsData>;

  http?: Maybe<ZeekHttpData>;

  files?: Maybe<ZeekFileData>;

  ssl?: Maybe<ZeekSslData>;
}

export interface ZeekConnectionData {
  local_resp?: Maybe<boolean[]>;

  local_orig?: Maybe<boolean[]>;

  missed_bytes?: Maybe<number[]>;

  state?: Maybe<string[]>;

  history?: Maybe<string[]>;
}

export interface ZeekNoticeData {
  suppress_for?: Maybe<number[]>;

  msg?: Maybe<string[]>;

  note?: Maybe<string[]>;

  sub?: Maybe<string[]>;

  dst?: Maybe<string[]>;

  dropped?: Maybe<boolean[]>;

  peer_descr?: Maybe<string[]>;
}

export interface ZeekDnsData {
  AA?: Maybe<boolean[]>;

  qclass_name?: Maybe<string[]>;

  RD?: Maybe<boolean[]>;

  qtype_name?: Maybe<string[]>;

  rejected?: Maybe<boolean[]>;

  qtype?: Maybe<string[]>;

  query?: Maybe<string[]>;

  trans_id?: Maybe<number[]>;

  qclass?: Maybe<string[]>;

  RA?: Maybe<boolean[]>;

  TC?: Maybe<boolean[]>;
}

export interface ZeekHttpData {
  resp_mime_types?: Maybe<string[]>;

  trans_depth?: Maybe<string[]>;

  status_msg?: Maybe<string[]>;

  resp_fuids?: Maybe<string[]>;

  tags?: Maybe<string[]>;
}

export interface ZeekFileData {
  session_ids?: Maybe<string[]>;

  timedout?: Maybe<boolean[]>;

  local_orig?: Maybe<boolean[]>;

  tx_host?: Maybe<string[]>;

  source?: Maybe<string[]>;

  is_orig?: Maybe<boolean[]>;

  overflow_bytes?: Maybe<number[]>;

  sha1?: Maybe<string[]>;

  duration?: Maybe<number[]>;

  depth?: Maybe<number[]>;

  analyzers?: Maybe<string[]>;

  mime_type?: Maybe<string[]>;

  rx_host?: Maybe<string[]>;

  total_bytes?: Maybe<number[]>;

  fuid?: Maybe<string[]>;

  seen_bytes?: Maybe<number[]>;

  missing_bytes?: Maybe<number[]>;

  md5?: Maybe<string[]>;
}

export interface ZeekSslData {
  cipher?: Maybe<string[]>;

  established?: Maybe<boolean[]>;

  resumed?: Maybe<boolean[]>;

  version?: Maybe<string[]>;
}

export interface HttpEcsFields {
  version?: Maybe<string[]>;

  request?: Maybe<HttpRequestData>;

  response?: Maybe<HttpResponseData>;
}

export interface HttpRequestData {
  method?: Maybe<string[]>;

  body?: Maybe<HttpBodyData>;

  referrer?: Maybe<string[]>;

  bytes?: Maybe<number[]>;
}

export interface HttpBodyData {
  content?: Maybe<string[]>;

  bytes?: Maybe<number[]>;
}

export interface HttpResponseData {
  status_code?: Maybe<number[]>;

  body?: Maybe<HttpBodyData>;

  bytes?: Maybe<number[]>;
}

export interface UrlEcsFields {
  domain?: Maybe<string[]>;

  original?: Maybe<string[]>;

  username?: Maybe<string[]>;

  password?: Maybe<string[]>;
}

export interface ProcessEcsFields {
  pid?: Maybe<number[]>;

  name?: Maybe<string[]>;

  ppid?: Maybe<number[]>;

  args?: Maybe<string[]>;

  executable?: Maybe<string[]>;

  title?: Maybe<string[]>;

  thread?: Maybe<Thread>;

  working_directory?: Maybe<string[]>;
}

export interface Thread {
  id?: Maybe<number[]>;

  start?: Maybe<string[]>;
}

export interface FileFields {
  path?: Maybe<string[]>;

  target_path?: Maybe<string[]>;

  extension?: Maybe<string[]>;

  type?: Maybe<string[]>;

  device?: Maybe<string[]>;

  inode?: Maybe<string[]>;

  uid?: Maybe<string[]>;

  owner?: Maybe<string[]>;

  gid?: Maybe<string[]>;

  group?: Maybe<string[]>;

  mode?: Maybe<string[]>;

  size?: Maybe<number[]>;

  mtime?: Maybe<string[]>;

  ctime?: Maybe<string[]>;
}

export interface SystemEcsField {
  audit?: Maybe<AuditEcsFields>;

  auth?: Maybe<AuthEcsFields>;
}

export interface AuditEcsFields {
  package?: Maybe<PackageEcsFields>;
}

export interface PackageEcsFields {
  arch?: Maybe<string[]>;

  entity_id?: Maybe<string[]>;

  name?: Maybe<string[]>;

  size?: Maybe<number[]>;

  summary?: Maybe<string[]>;

  version?: Maybe<string[]>;
}

export interface AuthEcsFields {
  ssh?: Maybe<SshEcsFields>;
}

export interface SshEcsFields {
  method?: Maybe<string[]>;

  signature?: Maybe<string[]>;
}

export interface PageInfo {
  endCursor?: Maybe<CursorType>;

  hasNextPage?: Maybe<boolean>;
}

export interface TimelineDetailsData {
  data?: Maybe<DetailItem[]>;

  inspect?: Maybe<Inspect>;
}

export interface DetailItem {
  field: string;

  values?: Maybe<string[]>;

  originalValue?: Maybe<EsValue>;
}

export interface LastEventTimeData {
  lastSeen?: Maybe<string>;

  inspect?: Maybe<Inspect>;
}

export interface EventsOverTimeData {
  inspect?: Maybe<Inspect>;

  eventsOverTime: MatrixOverTimeHistogramData[];

  totalCount: number;
}

export interface MatrixOverTimeHistogramData {
  x: number;

  y: number;

  g: string;
}

export interface HostsData {
  edges: HostsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface HostsEdges {
  node: HostItem;

  cursor: CursorType;
}

export interface HostItem {
  _id?: Maybe<string>;

  lastSeen?: Maybe<string>;

  host?: Maybe<HostEcsFields>;

  cloud?: Maybe<CloudFields>;

  inspect?: Maybe<Inspect>;
}

export interface CloudFields {
  instance?: Maybe<CloudInstance>;

  machine?: Maybe<CloudMachine>;

  provider?: Maybe<(Maybe<string>)[]>;

  region?: Maybe<(Maybe<string>)[]>;
}

export interface CloudInstance {
  id?: Maybe<(Maybe<string>)[]>;
}

export interface CloudMachine {
  type?: Maybe<(Maybe<string>)[]>;
}

export interface FirstLastSeenHost {
  inspect?: Maybe<Inspect>;

  firstSeen?: Maybe<string>;

  lastSeen?: Maybe<string>;
}

export interface IpOverviewData {
  client?: Maybe<Overview>;

  destination?: Maybe<Overview>;

  host: HostEcsFields;

  server?: Maybe<Overview>;

  source?: Maybe<Overview>;

  inspect?: Maybe<Inspect>;
}

export interface Overview {
  firstSeen?: Maybe<string>;

  lastSeen?: Maybe<string>;

  autonomousSystem: AutonomousSystem;

  geo: GeoEcsFields;
}

export interface AutonomousSystem {
  number?: Maybe<number>;

  organization?: Maybe<AutonomousSystemOrganization>;
}

export interface AutonomousSystemOrganization {
  name?: Maybe<string>;
}

export interface DomainsData {
  edges: DomainsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface DomainsEdges {
  node: DomainsNode;

  cursor: CursorType;
}

export interface DomainsNode {
  _id?: Maybe<string>;

  timestamp?: Maybe<string>;

  source?: Maybe<DomainsItem>;

  destination?: Maybe<DomainsItem>;

  client?: Maybe<DomainsItem>;

  server?: Maybe<DomainsItem>;

  network?: Maybe<DomainsNetworkField>;
}

export interface DomainsItem {
  uniqueIpCount?: Maybe<number>;

  domainName?: Maybe<string>;

  firstSeen?: Maybe<string>;

  lastSeen?: Maybe<string>;
}

export interface DomainsNetworkField {
  bytes?: Maybe<number>;

  packets?: Maybe<number>;

  transport?: Maybe<string>;

  direction?: Maybe<NetworkDirectionEcs[]>;
}

export interface TlsData {
  edges: TlsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface TlsEdges {
  node: TlsNode;

  cursor: CursorType;
}

export interface TlsNode {
  _id?: Maybe<string>;

  timestamp?: Maybe<string>;

  alternativeNames?: Maybe<string[]>;

  notAfter?: Maybe<string[]>;

  commonNames?: Maybe<string[]>;

  ja3?: Maybe<string[]>;

  issuerNames?: Maybe<string[]>;
}

export interface UsersData {
  edges: UsersEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface UsersEdges {
  node: UsersNode;

  cursor: CursorType;
}

export interface UsersNode {
  _id?: Maybe<string>;

  timestamp?: Maybe<string>;

  user?: Maybe<UsersItem>;
}

export interface UsersItem {
  name?: Maybe<string>;

  id?: Maybe<string[]>;

  groupId?: Maybe<string[]>;

  groupName?: Maybe<string[]>;

  count?: Maybe<number>;
}

export interface KpiNetworkData {
  networkEvents?: Maybe<number>;

  uniqueFlowId?: Maybe<number>;

  uniqueSourcePrivateIps?: Maybe<number>;

  uniqueSourcePrivateIpsHistogram?: Maybe<KpiNetworkHistogramData[]>;

  uniqueDestinationPrivateIps?: Maybe<number>;

  uniqueDestinationPrivateIpsHistogram?: Maybe<KpiNetworkHistogramData[]>;

  dnsQueries?: Maybe<number>;

  tlsHandshakes?: Maybe<number>;

  inspect?: Maybe<Inspect>;
}

export interface KpiNetworkHistogramData {
  x?: Maybe<number>;

  y?: Maybe<number>;
}

export interface KpiHostsData {
  hosts?: Maybe<number>;

  hostsHistogram?: Maybe<KpiHostHistogramData[]>;

  authSuccess?: Maybe<number>;

  authSuccessHistogram?: Maybe<KpiHostHistogramData[]>;

  authFailure?: Maybe<number>;

  authFailureHistogram?: Maybe<KpiHostHistogramData[]>;

  uniqueSourceIps?: Maybe<number>;

  uniqueSourceIpsHistogram?: Maybe<KpiHostHistogramData[]>;

  uniqueDestinationIps?: Maybe<number>;

  uniqueDestinationIpsHistogram?: Maybe<KpiHostHistogramData[]>;

  inspect?: Maybe<Inspect>;
}

export interface KpiHostHistogramData {
  x?: Maybe<number>;

  y?: Maybe<number>;
}

export interface KpiHostDetailsData {
  authSuccess?: Maybe<number>;

  authSuccessHistogram?: Maybe<KpiHostHistogramData[]>;

  authFailure?: Maybe<number>;

  authFailureHistogram?: Maybe<KpiHostHistogramData[]>;

  uniqueSourceIps?: Maybe<number>;

  uniqueSourceIpsHistogram?: Maybe<KpiHostHistogramData[]>;

  uniqueDestinationIps?: Maybe<number>;

  uniqueDestinationIpsHistogram?: Maybe<KpiHostHistogramData[]>;

  inspect?: Maybe<Inspect>;
}

export interface NetworkTopNFlowData {
  edges: NetworkTopNFlowEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface NetworkTopNFlowEdges {
  node: NetworkTopNFlowItem;

  cursor: CursorType;
}

export interface NetworkTopNFlowItem {
  _id?: Maybe<string>;

  source?: Maybe<TopNFlowItemSource>;

  destination?: Maybe<TopNFlowItemDestination>;

  network?: Maybe<TopNFlowNetworkEcsField>;
}

export interface TopNFlowItemSource {
  autonomous_system?: Maybe<AutonomousSystemItem>;

  domain?: Maybe<string[]>;

  ip?: Maybe<string>;

  location?: Maybe<GeoItem>;

  flows?: Maybe<number>;

  destination_ips?: Maybe<number>;
}

export interface AutonomousSystemItem {
  name?: Maybe<string>;

  number?: Maybe<number>;
}

export interface GeoItem {
  geo?: Maybe<GeoEcsFields>;

  flowTarget?: Maybe<FlowTarget>;
}

export interface TopNFlowItemDestination {
  autonomous_system?: Maybe<AutonomousSystemItem>;

  domain?: Maybe<string[]>;

  ip?: Maybe<string>;

  location?: Maybe<GeoItem>;

  flows?: Maybe<number>;

  source_ips?: Maybe<number>;
}

export interface TopNFlowNetworkEcsField {
  bytes_in?: Maybe<number>;

  bytes_out?: Maybe<number>;
}

export interface NetworkDnsData {
  edges: NetworkDnsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface NetworkDnsEdges {
  node: NetworkDnsItem;

  cursor: CursorType;
}

export interface NetworkDnsItem {
  _id?: Maybe<string>;

  dnsBytesIn?: Maybe<number>;

  dnsBytesOut?: Maybe<number>;

  dnsName?: Maybe<string>;

  queryCount?: Maybe<number>;

  uniqueDomains?: Maybe<number>;
}

export interface OverviewNetworkData {
  auditbeatSocket?: Maybe<number>;

  filebeatCisco?: Maybe<number>;

  filebeatNetflow?: Maybe<number>;

  filebeatPanw?: Maybe<number>;

  filebeatSuricata?: Maybe<number>;

  filebeatZeek?: Maybe<number>;

  packetbeatDNS?: Maybe<number>;

  packetbeatFlow?: Maybe<number>;

  packetbeatTLS?: Maybe<number>;

  inspect?: Maybe<Inspect>;
}

export interface OverviewHostData {
  auditbeatAuditd?: Maybe<number>;

  auditbeatFIM?: Maybe<number>;

  auditbeatLogin?: Maybe<number>;

  auditbeatPackage?: Maybe<number>;

  auditbeatProcess?: Maybe<number>;

  auditbeatUser?: Maybe<number>;

  filebeatSystemModule?: Maybe<number>;

  winlogbeat?: Maybe<number>;

  inspect?: Maybe<Inspect>;
}

export interface UncommonProcessesData {
  edges: UncommonProcessesEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface UncommonProcessesEdges {
  node: UncommonProcessItem;

  cursor: CursorType;
}

export interface UncommonProcessItem {
  _id: string;

  instances: number;

  process: ProcessEcsFields;

  hosts: HostEcsFields[];

  user?: Maybe<UserEcsFields>;
}

export interface SayMyName {
  /** The id of the source */
  appName: string;
}

export interface TimelineResult {
  savedObjectId: string;

  columns?: Maybe<ColumnHeaderResult[]>;

  dataProviders?: Maybe<DataProviderResult[]>;

  dateRange?: Maybe<DateRangePickerResult>;

  description?: Maybe<string>;

  eventIdToNoteIds?: Maybe<NoteResult[]>;

  favorite?: Maybe<FavoriteTimelineResult[]>;

  kqlMode?: Maybe<string>;

  kqlQuery?: Maybe<SerializedFilterQueryResult>;

  notes?: Maybe<NoteResult[]>;

  noteIds?: Maybe<string[]>;

  pinnedEventIds?: Maybe<string[]>;

  pinnedEventsSaveObject?: Maybe<PinnedEvent[]>;

  title?: Maybe<string>;

  sort?: Maybe<SortTimelineResult>;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version: string;
}

export interface ColumnHeaderResult {
  aggregatable?: Maybe<boolean>;

  category?: Maybe<string>;

  columnHeaderType?: Maybe<string>;

  description?: Maybe<string>;

  example?: Maybe<string>;

  indexes?: Maybe<string[]>;

  id?: Maybe<string>;

  name?: Maybe<string>;

  placeholder?: Maybe<string>;

  searchable?: Maybe<boolean>;

  type?: Maybe<string>;
}

export interface DataProviderResult {
  id?: Maybe<string>;

  name?: Maybe<string>;

  enabled?: Maybe<boolean>;

  excluded?: Maybe<boolean>;

  kqlQuery?: Maybe<string>;

  queryMatch?: Maybe<QueryMatchResult>;

  and?: Maybe<DataProviderResult[]>;
}

export interface QueryMatchResult {
  field?: Maybe<string>;

  displayField?: Maybe<string>;

  value?: Maybe<string>;

  displayValue?: Maybe<string>;

  operator?: Maybe<string>;
}

export interface DateRangePickerResult {
  start?: Maybe<number>;

  end?: Maybe<number>;
}

export interface FavoriteTimelineResult {
  fullName?: Maybe<string>;

  userName?: Maybe<string>;

  favoriteDate?: Maybe<number>;
}

export interface SerializedFilterQueryResult {
  filterQuery?: Maybe<SerializedKueryQueryResult>;
}

export interface SerializedKueryQueryResult {
  kuery?: Maybe<KueryFilterQueryResult>;

  serializedQuery?: Maybe<string>;
}

export interface KueryFilterQueryResult {
  kind?: Maybe<string>;

  expression?: Maybe<string>;
}

export interface SortTimelineResult {
  columnId?: Maybe<string>;

  sortDirection?: Maybe<string>;
}

export interface ResponseTimelines {
  timeline: (Maybe<TimelineResult>)[];

  totalCount?: Maybe<number>;
}

export interface Mutation {
  /** Persists a note */
  persistNote: ResponseNote;

  deleteNote?: Maybe<boolean>;

  deleteNoteByTimelineId?: Maybe<boolean>;
  /** Persists a pinned event in a timeline */
  persistPinnedEventOnTimeline?: Maybe<PinnedEvent>;
  /** Remove a pinned events in a timeline */
  deletePinnedEventOnTimeline: boolean;
  /** Remove all pinned events in a timeline */
  deleteAllPinnedEventsOnTimeline: boolean;
  /** Persists a timeline */
  persistTimeline: ResponseTimeline;

  persistFavorite: ResponseFavoriteTimeline;

  deleteTimeline: boolean;
}

export interface ResponseNote {
  code?: Maybe<number>;

  message?: Maybe<string>;

  note: NoteResult;
}

export interface ResponseTimeline {
  code?: Maybe<number>;

  message?: Maybe<string>;

  timeline: TimelineResult;
}

export interface ResponseFavoriteTimeline {
  code?: Maybe<number>;

  message?: Maybe<string>;

  savedObjectId: string;

  version: string;

  favorite?: Maybe<FavoriteTimelineResult[]>;
}

export interface EcsEdges {
  node: ECS;

  cursor: CursorType;
}

export interface EventsTimelineData {
  edges: EcsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Maybe<Inspect>;
}

export interface OsFields {
  platform?: Maybe<string>;

  name?: Maybe<string>;

  full?: Maybe<string>;

  family?: Maybe<string>;

  version?: Maybe<string>;

  kernel?: Maybe<string>;
}

export interface HostFields {
  architecture?: Maybe<string>;

  id?: Maybe<string>;

  ip?: Maybe<(Maybe<string>)[]>;

  mac?: Maybe<(Maybe<string>)[]>;

  name?: Maybe<string>;

  os?: Maybe<OsFields>;

  type?: Maybe<string>;
}

// ====================================================
// Arguments
// ====================================================

export interface getNoteQueryArgs {
  id: string;
}
export interface getNotesByTimelineIdQueryArgs {
  timelineId: string;
}
export interface getNotesByEventIdQueryArgs {
  eventId: string;
}
export interface getAllNotesQueryArgs {
  pageInfo?: Maybe<PageInfoNote>;

  search?: Maybe<string>;

  sort?: Maybe<SortNote>;
}
export interface getAllPinnedEventsByTimelineIdQueryArgs {
  timelineId: string;
}
export interface sourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface getOneTimelineQueryArgs {
  id: string;
}
export interface getAllTimelineQueryArgs {
  pageInfo?: Maybe<PageInfoTimeline>;

  search?: Maybe<string>;

  sort?: Maybe<SortTimeline>;

  onlyUserFavorite?: Maybe<boolean>;
}
export interface AuthenticationsSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInputPaginated;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface TimelineSourceArgs {
  pagination: PaginationInput;

  sortField: SortField;

  fieldRequested: string[];

  timerange?: Maybe<TimerangeInput>;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface TimelineDetailsSourceArgs {
  eventId: string;

  indexName: string;

  defaultIndex: string[];
}
export interface LastEventTimeSourceArgs {
  id?: Maybe<string>;

  indexKey: LastEventIndexKey;

  details: LastTimeDetails;

  defaultIndex: string[];
}
export interface EventsOverTimeSourceArgs {
  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface HostsSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  pagination: PaginationInputPaginated;

  sort: HostsSortField;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface HostOverviewSourceArgs {
  id?: Maybe<string>;

  hostName: string;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface HostFirstLastSeenSourceArgs {
  id?: Maybe<string>;

  hostName: string;

  defaultIndex: string[];
}
export interface IpOverviewSourceArgs {
  id?: Maybe<string>;

  filterQuery?: Maybe<string>;

  ip: string;

  defaultIndex: string[];
}
export interface DomainsSourceArgs {
  filterQuery?: Maybe<string>;

  id?: Maybe<string>;

  ip: string;

  pagination: PaginationInputPaginated;

  sort: DomainsSortField;

  flowDirection: FlowDirection;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface TlsSourceArgs {
  filterQuery?: Maybe<string>;

  id?: Maybe<string>;

  ip: string;

  pagination: PaginationInputPaginated;

  sort: TlsSortField;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface UsersSourceArgs {
  filterQuery?: Maybe<string>;

  id?: Maybe<string>;

  ip: string;

  pagination: PaginationInputPaginated;

  sort: UsersSortField;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface KpiNetworkSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface KpiHostsSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface KpiHostDetailsSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface NetworkTopNFlowSourceArgs {
  id?: Maybe<string>;

  filterQuery?: Maybe<string>;

  flowTarget: FlowTargetNew;

  pagination: PaginationInputPaginated;

  sort: NetworkTopNFlowSortField;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface NetworkDnsSourceArgs {
  filterQuery?: Maybe<string>;

  id?: Maybe<string>;

  isPtrIncluded: boolean;

  pagination: PaginationInputPaginated;

  sort: NetworkDnsSortField;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface OverviewNetworkSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface OverviewHostSourceArgs {
  id?: Maybe<string>;

  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface UncommonProcessesSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInputPaginated;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface indicesExistSourceStatusArgs {
  defaultIndex: string[];
}
export interface indexFieldsSourceStatusArgs {
  defaultIndex: string[];
}
export interface persistNoteMutationArgs {
  noteId?: Maybe<string>;

  version?: Maybe<string>;

  note: NoteInput;
}
export interface deleteNoteMutationArgs {
  id: string[];
}
export interface deleteNoteByTimelineIdMutationArgs {
  timelineId: string;

  version?: Maybe<string>;
}
export interface persistPinnedEventOnTimelineMutationArgs {
  pinnedEventId?: Maybe<string>;

  eventId: string;

  timelineId?: Maybe<string>;
}
export interface deletePinnedEventOnTimelineMutationArgs {
  id: string[];
}
export interface deleteAllPinnedEventsOnTimelineMutationArgs {
  timelineId: string;
}
export interface persistTimelineMutationArgs {
  id?: Maybe<string>;

  version?: Maybe<string>;

  timeline: TimelineInput;
}
export interface persistFavoriteMutationArgs {
  timelineId?: Maybe<string>;
}
export interface deleteTimelineMutationArgs {
  id: string[];
}

import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';

export type Resolver<Result, Parent = {}, TContext = {}, Args = {}> = (
  parent: Parent,
  args: Args,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface ISubscriptionResolverObject<Result, Parent, TContext, Args> {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: TContext,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result> | Promise<AsyncIterator<R | Result>>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: TContext,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
}

export type SubscriptionResolver<Result, Parent = {}, TContext = {}, Args = {}> =
  | ((...args: any[]) => ISubscriptionResolverObject<Result, Parent, TContext, Args>)
  | ISubscriptionResolverObject<Result, Parent, TContext, Args>;

export type TypeResolveFn<Types, Parent = {}, TContext = {}> = (
  parent: Parent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<Types>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult, TArgs = {}, TContext = {}> = (
  next: NextResolverFn<TResult>,
  source: any,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export namespace QueryResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = {}> {
    getNote?: getNoteResolver<NoteResult, TypeParent, TContext>;

    getNotesByTimelineId?: getNotesByTimelineIdResolver<NoteResult[], TypeParent, TContext>;

    getNotesByEventId?: getNotesByEventIdResolver<NoteResult[], TypeParent, TContext>;

    getAllNotes?: getAllNotesResolver<ResponseNotes, TypeParent, TContext>;

    getAllPinnedEventsByTimelineId?: getAllPinnedEventsByTimelineIdResolver<
      PinnedEvent[],
      TypeParent,
      TContext
    >;
    /** Get a security data source by id */
    source?: sourceResolver<Source, TypeParent, TContext>;
    /** Get a list of all security data sources */
    allSources?: allSourcesResolver<Source[], TypeParent, TContext>;

    getOneTimeline?: getOneTimelineResolver<TimelineResult, TypeParent, TContext>;

    getAllTimeline?: getAllTimelineResolver<ResponseTimelines, TypeParent, TContext>;
  }

  export type getNoteResolver<R = NoteResult, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    getNoteArgs
  >;
  export interface getNoteArgs {
    id: string;
  }

  export type getNotesByTimelineIdResolver<
    R = NoteResult[],
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, getNotesByTimelineIdArgs>;
  export interface getNotesByTimelineIdArgs {
    timelineId: string;
  }

  export type getNotesByEventIdResolver<
    R = NoteResult[],
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, getNotesByEventIdArgs>;
  export interface getNotesByEventIdArgs {
    eventId: string;
  }

  export type getAllNotesResolver<
    R = ResponseNotes,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, getAllNotesArgs>;
  export interface getAllNotesArgs {
    pageInfo?: Maybe<PageInfoNote>;

    search?: Maybe<string>;

    sort?: Maybe<SortNote>;
  }

  export type getAllPinnedEventsByTimelineIdResolver<
    R = PinnedEvent[],
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, getAllPinnedEventsByTimelineIdArgs>;
  export interface getAllPinnedEventsByTimelineIdArgs {
    timelineId: string;
  }

  export type sourceResolver<R = Source, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    sourceArgs
  >;
  export interface sourceArgs {
    /** The id of the source */
    id: string;
  }

  export type allSourcesResolver<R = Source[], Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type getOneTimelineResolver<
    R = TimelineResult,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, getOneTimelineArgs>;
  export interface getOneTimelineArgs {
    id: string;
  }

  export type getAllTimelineResolver<
    R = ResponseTimelines,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, getAllTimelineArgs>;
  export interface getAllTimelineArgs {
    pageInfo?: Maybe<PageInfoTimeline>;

    search?: Maybe<string>;

    sort?: Maybe<SortTimeline>;

    onlyUserFavorite?: Maybe<boolean>;
  }
}

export namespace NoteResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NoteResult> {
    eventId?: eventIdResolver<Maybe<string>, TypeParent, TContext>;

    note?: noteResolver<Maybe<string>, TypeParent, TContext>;

    timelineId?: timelineIdResolver<Maybe<string>, TypeParent, TContext>;

    noteId?: noteIdResolver<string, TypeParent, TContext>;

    created?: createdResolver<Maybe<number>, TypeParent, TContext>;

    createdBy?: createdByResolver<Maybe<string>, TypeParent, TContext>;

    timelineVersion?: timelineVersionResolver<Maybe<string>, TypeParent, TContext>;

    updated?: updatedResolver<Maybe<number>, TypeParent, TContext>;

    updatedBy?: updatedByResolver<Maybe<string>, TypeParent, TContext>;

    version?: versionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type eventIdResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type noteResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timelineIdResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type noteIdResolver<R = string, Parent = NoteResult, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type createdResolver<
    R = Maybe<number>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type createdByResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timelineVersionResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type updatedResolver<
    R = Maybe<number>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type updatedByResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseNotesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseNotes> {
    notes?: notesResolver<NoteResult[], TypeParent, TContext>;

    totalCount?: totalCountResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type notesResolver<
    R = NoteResult[],
    Parent = ResponseNotes,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = Maybe<number>,
    Parent = ResponseNotes,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PinnedEventResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PinnedEvent> {
    code?: codeResolver<Maybe<number>, TypeParent, TContext>;

    message?: messageResolver<Maybe<string>, TypeParent, TContext>;

    pinnedEventId?: pinnedEventIdResolver<string, TypeParent, TContext>;

    eventId?: eventIdResolver<Maybe<string>, TypeParent, TContext>;

    timelineId?: timelineIdResolver<Maybe<string>, TypeParent, TContext>;

    timelineVersion?: timelineVersionResolver<Maybe<string>, TypeParent, TContext>;

    created?: createdResolver<Maybe<number>, TypeParent, TContext>;

    createdBy?: createdByResolver<Maybe<string>, TypeParent, TContext>;

    updated?: updatedResolver<Maybe<number>, TypeParent, TContext>;

    updatedBy?: updatedByResolver<Maybe<string>, TypeParent, TContext>;

    version?: versionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type codeResolver<
    R = Maybe<number>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type messageResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pinnedEventIdResolver<
    R = string,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type eventIdResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timelineIdResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timelineVersionResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type createdResolver<
    R = Maybe<number>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type createdByResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type updatedResolver<
    R = Maybe<number>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type updatedByResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SourceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Source> {
    /** The id of the source */
    id?: idResolver<string, TypeParent, TContext>;
    /** The raw configuration of the source */
    configuration?: configurationResolver<SourceConfiguration, TypeParent, TContext>;
    /** The status of the source */
    status?: statusResolver<SourceStatus, TypeParent, TContext>;
    /** Gets Authentication success and failures based on a timerange */
    Authentications?: AuthenticationsResolver<AuthenticationsData, TypeParent, TContext>;

    Timeline?: TimelineResolver<TimelineData, TypeParent, TContext>;

    TimelineDetails?: TimelineDetailsResolver<TimelineDetailsData, TypeParent, TContext>;

    LastEventTime?: LastEventTimeResolver<LastEventTimeData, TypeParent, TContext>;

    EventsOverTime?: EventsOverTimeResolver<EventsOverTimeData, TypeParent, TContext>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Hosts?: HostsResolver<HostsData, TypeParent, TContext>;

    HostOverview?: HostOverviewResolver<HostItem, TypeParent, TContext>;

    HostFirstLastSeen?: HostFirstLastSeenResolver<FirstLastSeenHost, TypeParent, TContext>;

    IpOverview?: IpOverviewResolver<Maybe<IpOverviewData>, TypeParent, TContext>;

    Domains?: DomainsResolver<DomainsData, TypeParent, TContext>;

    Tls?: TlsResolver<TlsData, TypeParent, TContext>;

    Users?: UsersResolver<UsersData, TypeParent, TContext>;

    KpiNetwork?: KpiNetworkResolver<Maybe<KpiNetworkData>, TypeParent, TContext>;

    KpiHosts?: KpiHostsResolver<KpiHostsData, TypeParent, TContext>;

    KpiHostDetails?: KpiHostDetailsResolver<KpiHostDetailsData, TypeParent, TContext>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    NetworkTopNFlow?: NetworkTopNFlowResolver<NetworkTopNFlowData, TypeParent, TContext>;

    NetworkDns?: NetworkDnsResolver<NetworkDnsData, TypeParent, TContext>;

    OverviewNetwork?: OverviewNetworkResolver<Maybe<OverviewNetworkData>, TypeParent, TContext>;

    OverviewHost?: OverviewHostResolver<Maybe<OverviewHostData>, TypeParent, TContext>;
    /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
    UncommonProcesses?: UncommonProcessesResolver<UncommonProcessesData, TypeParent, TContext>;
    /** Just a simple example to get the app name */
    whoAmI?: whoAmIResolver<Maybe<SayMyName>, TypeParent, TContext>;
  }

  export type idResolver<R = string, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type configurationResolver<
    R = SourceConfiguration,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type statusResolver<R = SourceStatus, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type AuthenticationsResolver<
    R = AuthenticationsData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, AuthenticationsArgs>;
  export interface AuthenticationsArgs {
    timerange: TimerangeInput;

    pagination: PaginationInputPaginated;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type TimelineResolver<
    R = TimelineData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, TimelineArgs>;
  export interface TimelineArgs {
    pagination: PaginationInput;

    sortField: SortField;

    fieldRequested: string[];

    timerange?: Maybe<TimerangeInput>;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type TimelineDetailsResolver<
    R = TimelineDetailsData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, TimelineDetailsArgs>;
  export interface TimelineDetailsArgs {
    eventId: string;

    indexName: string;

    defaultIndex: string[];
  }

  export type LastEventTimeResolver<
    R = LastEventTimeData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, LastEventTimeArgs>;
  export interface LastEventTimeArgs {
    id?: Maybe<string>;

    indexKey: LastEventIndexKey;

    details: LastTimeDetails;

    defaultIndex: string[];
  }

  export type EventsOverTimeResolver<
    R = EventsOverTimeData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, EventsOverTimeArgs>;
  export interface EventsOverTimeArgs {
    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type HostsResolver<R = HostsData, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    HostsArgs
  >;
  export interface HostsArgs {
    id?: Maybe<string>;

    timerange: TimerangeInput;

    pagination: PaginationInputPaginated;

    sort: HostsSortField;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type HostOverviewResolver<
    R = HostItem,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, HostOverviewArgs>;
  export interface HostOverviewArgs {
    id?: Maybe<string>;

    hostName: string;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type HostFirstLastSeenResolver<
    R = FirstLastSeenHost,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, HostFirstLastSeenArgs>;
  export interface HostFirstLastSeenArgs {
    id?: Maybe<string>;

    hostName: string;

    defaultIndex: string[];
  }

  export type IpOverviewResolver<
    R = Maybe<IpOverviewData>,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, IpOverviewArgs>;
  export interface IpOverviewArgs {
    id?: Maybe<string>;

    filterQuery?: Maybe<string>;

    ip: string;

    defaultIndex: string[];
  }

  export type DomainsResolver<R = DomainsData, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    DomainsArgs
  >;
  export interface DomainsArgs {
    filterQuery?: Maybe<string>;

    id?: Maybe<string>;

    ip: string;

    pagination: PaginationInputPaginated;

    sort: DomainsSortField;

    flowDirection: FlowDirection;

    flowTarget: FlowTarget;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type TlsResolver<R = TlsData, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    TlsArgs
  >;
  export interface TlsArgs {
    filterQuery?: Maybe<string>;

    id?: Maybe<string>;

    ip: string;

    pagination: PaginationInputPaginated;

    sort: TlsSortField;

    flowTarget: FlowTarget;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type UsersResolver<R = UsersData, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    UsersArgs
  >;
  export interface UsersArgs {
    filterQuery?: Maybe<string>;

    id?: Maybe<string>;

    ip: string;

    pagination: PaginationInputPaginated;

    sort: UsersSortField;

    flowTarget: FlowTarget;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type KpiNetworkResolver<
    R = Maybe<KpiNetworkData>,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, KpiNetworkArgs>;
  export interface KpiNetworkArgs {
    id?: Maybe<string>;

    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type KpiHostsResolver<
    R = KpiHostsData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, KpiHostsArgs>;
  export interface KpiHostsArgs {
    id?: Maybe<string>;

    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type KpiHostDetailsResolver<
    R = KpiHostDetailsData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, KpiHostDetailsArgs>;
  export interface KpiHostDetailsArgs {
    id?: Maybe<string>;

    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type NetworkTopNFlowResolver<
    R = NetworkTopNFlowData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, NetworkTopNFlowArgs>;
  export interface NetworkTopNFlowArgs {
    id?: Maybe<string>;

    filterQuery?: Maybe<string>;

    flowTarget: FlowTargetNew;

    pagination: PaginationInputPaginated;

    sort: NetworkTopNFlowSortField;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type NetworkDnsResolver<
    R = NetworkDnsData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, NetworkDnsArgs>;
  export interface NetworkDnsArgs {
    filterQuery?: Maybe<string>;

    id?: Maybe<string>;

    isPtrIncluded: boolean;

    pagination: PaginationInputPaginated;

    sort: NetworkDnsSortField;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type OverviewNetworkResolver<
    R = Maybe<OverviewNetworkData>,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, OverviewNetworkArgs>;
  export interface OverviewNetworkArgs {
    id?: Maybe<string>;

    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type OverviewHostResolver<
    R = Maybe<OverviewHostData>,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, OverviewHostArgs>;
  export interface OverviewHostArgs {
    id?: Maybe<string>;

    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type UncommonProcessesResolver<
    R = UncommonProcessesData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, UncommonProcessesArgs>;
  export interface UncommonProcessesArgs {
    timerange: TimerangeInput;

    pagination: PaginationInputPaginated;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

  export type whoAmIResolver<
    R = Maybe<SayMyName>,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceConfiguration> {
    /** The field mapping to use for this source */
    fields?: fieldsResolver<SourceFields, TypeParent, TContext>;
  }

  export type fieldsResolver<
    R = SourceFields,
    Parent = SourceConfiguration,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceFields> {
    /** The field to identify a container by */
    container?: containerResolver<string, TypeParent, TContext>;
    /** The fields to identify a host by */
    host?: hostResolver<string, TypeParent, TContext>;
    /** The fields that may contain the log event message. The first field found win. */
    message?: messageResolver<string[], TypeParent, TContext>;
    /** The field to identify a pod by */
    pod?: podResolver<string, TypeParent, TContext>;
    /** The field to use as a tiebreaker for log events that have identical timestamps */
    tiebreaker?: tiebreakerResolver<string, TypeParent, TContext>;
    /** The field to use as a timestamp for metrics and logs */
    timestamp?: timestampResolver<string, TypeParent, TContext>;
  }

  export type containerResolver<
    R = string,
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hostResolver<R = string, Parent = SourceFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type messageResolver<
    R = string[],
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type podResolver<R = string, Parent = SourceFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type tiebreakerResolver<
    R = string,
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timestampResolver<
    R = string,
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}
/** The status of an infrastructure data source */
export namespace SourceStatusResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceStatus> {
    /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
    indicesExist?: indicesExistResolver<boolean, TypeParent, TContext>;
    /** The list of fields defined in the index mappings */
    indexFields?: indexFieldsResolver<IndexField[], TypeParent, TContext>;
  }

  export type indicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, indicesExistArgs>;
  export interface indicesExistArgs {
    defaultIndex: string[];
  }

  export type indexFieldsResolver<
    R = IndexField[],
    Parent = SourceStatus,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, indexFieldsArgs>;
  export interface indexFieldsArgs {
    defaultIndex: string[];
  }
}
/** A descriptor of a field in an index */
export namespace IndexFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = IndexField> {
    /** Where the field belong */
    category?: categoryResolver<string, TypeParent, TContext>;
    /** Example of field's value */
    example?: exampleResolver<Maybe<string>, TypeParent, TContext>;
    /** whether the field's belong to an alias index */
    indexes?: indexesResolver<(Maybe<string>)[], TypeParent, TContext>;
    /** The name of the field */
    name?: nameResolver<string, TypeParent, TContext>;
    /** The type of the field's values as recognized by Kibana */
    type?: typeResolver<string, TypeParent, TContext>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: searchableResolver<boolean, TypeParent, TContext>;
    /** Whether the field's values can be aggregated */
    aggregatable?: aggregatableResolver<boolean, TypeParent, TContext>;
    /** Description of the field */
    description?: descriptionResolver<Maybe<string>, TypeParent, TContext>;

    format?: formatResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type categoryResolver<R = string, Parent = IndexField, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type exampleResolver<
    R = Maybe<string>,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type indexesResolver<
    R = (Maybe<string>)[],
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<R = string, Parent = IndexField, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type typeResolver<R = string, Parent = IndexField, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type searchableResolver<
    R = boolean,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type aggregatableResolver<
    R = boolean,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type descriptionResolver<
    R = Maybe<string>,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type formatResolver<
    R = Maybe<string>,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationsData> {
    edges?: edgesResolver<AuthenticationsEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = AuthenticationsEdges[],
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationsEdges> {
    node?: nodeResolver<AuthenticationItem, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<
    R = AuthenticationItem,
    Parent = AuthenticationsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cursorResolver<
    R = CursorType,
    Parent = AuthenticationsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationItem> {
    _id?: _idResolver<string, TypeParent, TContext>;

    failures?: failuresResolver<number, TypeParent, TContext>;

    successes?: successesResolver<number, TypeParent, TContext>;

    user?: userResolver<UserEcsFields, TypeParent, TContext>;

    lastSuccess?: lastSuccessResolver<Maybe<LastSourceHost>, TypeParent, TContext>;

    lastFailure?: lastFailureResolver<Maybe<LastSourceHost>, TypeParent, TContext>;
  }

  export type _idResolver<
    R = string,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type failuresResolver<
    R = number,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type successesResolver<
    R = number,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type userResolver<
    R = UserEcsFields,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type lastSuccessResolver<
    R = Maybe<LastSourceHost>,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type lastFailureResolver<
    R = Maybe<LastSourceHost>,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UserEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UserEcsFields> {
    id?: idResolver<Maybe<string[]>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string[]>, TypeParent, TContext>;

    full_name?: full_nameResolver<Maybe<string[]>, TypeParent, TContext>;

    email?: emailResolver<Maybe<string[]>, TypeParent, TContext>;

    hash?: hashResolver<Maybe<string[]>, TypeParent, TContext>;

    group?: groupResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type idResolver<
    R = Maybe<string[]>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string[]>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type full_nameResolver<
    R = Maybe<string[]>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type emailResolver<
    R = Maybe<string[]>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hashResolver<
    R = Maybe<string[]>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type groupResolver<
    R = Maybe<string[]>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace LastSourceHostResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = LastSourceHost> {
    timestamp?: timestampResolver<Maybe<string>, TypeParent, TContext>;

    source?: sourceResolver<Maybe<SourceEcsFields>, TypeParent, TContext>;

    host?: hostResolver<Maybe<HostEcsFields>, TypeParent, TContext>;
  }

  export type timestampResolver<
    R = Maybe<string>,
    Parent = LastSourceHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sourceResolver<
    R = Maybe<SourceEcsFields>,
    Parent = LastSourceHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hostResolver<
    R = Maybe<HostEcsFields>,
    Parent = LastSourceHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceEcsFields> {
    bytes?: bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    ip?: ipResolver<Maybe<string[]>, TypeParent, TContext>;

    port?: portResolver<Maybe<number[]>, TypeParent, TContext>;

    domain?: domainResolver<Maybe<string[]>, TypeParent, TContext>;

    geo?: geoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    packets?: packetsResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type bytesResolver<
    R = Maybe<number[]>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ipResolver<
    R = Maybe<string[]>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type portResolver<
    R = Maybe<number[]>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type domainResolver<
    R = Maybe<string[]>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type geoResolver<
    R = Maybe<GeoEcsFields>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetsResolver<
    R = Maybe<number[]>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace GeoEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = GeoEcsFields> {
    city_name?: city_nameResolver<Maybe<string[]>, TypeParent, TContext>;

    continent_name?: continent_nameResolver<Maybe<string[]>, TypeParent, TContext>;

    country_iso_code?: country_iso_codeResolver<Maybe<string[]>, TypeParent, TContext>;

    country_name?: country_nameResolver<Maybe<string[]>, TypeParent, TContext>;

    location?: locationResolver<Maybe<Location>, TypeParent, TContext>;

    region_iso_code?: region_iso_codeResolver<Maybe<string[]>, TypeParent, TContext>;

    region_name?: region_nameResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type city_nameResolver<
    R = Maybe<string[]>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type continent_nameResolver<
    R = Maybe<string[]>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type country_iso_codeResolver<
    R = Maybe<string[]>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type country_nameResolver<
    R = Maybe<string[]>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type locationResolver<
    R = Maybe<Location>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type region_iso_codeResolver<
    R = Maybe<string[]>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type region_nameResolver<
    R = Maybe<string[]>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace LocationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Location> {
    lon?: lonResolver<Maybe<number[]>, TypeParent, TContext>;

    lat?: latResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type lonResolver<
    R = Maybe<number[]>,
    Parent = Location,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type latResolver<
    R = Maybe<number[]>,
    Parent = Location,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostEcsFields> {
    architecture?: architectureResolver<Maybe<string[]>, TypeParent, TContext>;

    id?: idResolver<Maybe<string[]>, TypeParent, TContext>;

    ip?: ipResolver<Maybe<string[]>, TypeParent, TContext>;

    mac?: macResolver<Maybe<string[]>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string[]>, TypeParent, TContext>;

    os?: osResolver<Maybe<OsEcsFields>, TypeParent, TContext>;

    type?: typeResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type architectureResolver<
    R = Maybe<string[]>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type idResolver<
    R = Maybe<string[]>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ipResolver<
    R = Maybe<string[]>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type macResolver<
    R = Maybe<string[]>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string[]>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type osResolver<
    R = Maybe<OsEcsFields>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type typeResolver<
    R = Maybe<string[]>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OsEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OsEcsFields> {
    platform?: platformResolver<Maybe<string[]>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string[]>, TypeParent, TContext>;

    full?: fullResolver<Maybe<string[]>, TypeParent, TContext>;

    family?: familyResolver<Maybe<string[]>, TypeParent, TContext>;

    version?: versionResolver<Maybe<string[]>, TypeParent, TContext>;

    kernel?: kernelResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type platformResolver<
    R = Maybe<string[]>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string[]>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type fullResolver<
    R = Maybe<string[]>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type familyResolver<
    R = Maybe<string[]>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = Maybe<string[]>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type kernelResolver<
    R = Maybe<string[]>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CursorTypeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CursorType> {
    value?: valueResolver<Maybe<string>, TypeParent, TContext>;

    tiebreaker?: tiebreakerResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type valueResolver<
    R = Maybe<string>,
    Parent = CursorType,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type tiebreakerResolver<
    R = Maybe<string>,
    Parent = CursorType,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PageInfoPaginatedResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PageInfoPaginated> {
    activePage?: activePageResolver<number, TypeParent, TContext>;

    fakeTotalCount?: fakeTotalCountResolver<number, TypeParent, TContext>;

    showMorePagesIndicator?: showMorePagesIndicatorResolver<boolean, TypeParent, TContext>;
  }

  export type activePageResolver<
    R = number,
    Parent = PageInfoPaginated,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type fakeTotalCountResolver<
    R = number,
    Parent = PageInfoPaginated,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type showMorePagesIndicatorResolver<
    R = boolean,
    Parent = PageInfoPaginated,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace InspectResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Inspect> {
    dsl?: dslResolver<string[], TypeParent, TContext>;

    response?: responseResolver<string[], TypeParent, TContext>;
  }

  export type dslResolver<R = string[], Parent = Inspect, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type responseResolver<R = string[], Parent = Inspect, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TimelineDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineData> {
    edges?: edgesResolver<TimelineEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfo, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = TimelineEdges[],
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfo,
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineEdges> {
    node?: nodeResolver<TimelineItem, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<
    R = TimelineItem,
    Parent = TimelineEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cursorResolver<
    R = CursorType,
    Parent = TimelineEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineItem> {
    _id?: _idResolver<string, TypeParent, TContext>;

    _index?: _indexResolver<Maybe<string>, TypeParent, TContext>;

    data?: dataResolver<TimelineNonEcsData[], TypeParent, TContext>;

    ecs?: ecsResolver<ECS, TypeParent, TContext>;
  }

  export type _idResolver<R = string, Parent = TimelineItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type _indexResolver<
    R = Maybe<string>,
    Parent = TimelineItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dataResolver<
    R = TimelineNonEcsData[],
    Parent = TimelineItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ecsResolver<R = ECS, Parent = TimelineItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TimelineNonEcsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineNonEcsData> {
    field?: fieldResolver<string, TypeParent, TContext>;

    value?: valueResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type fieldResolver<
    R = string,
    Parent = TimelineNonEcsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type valueResolver<
    R = Maybe<string[]>,
    Parent = TimelineNonEcsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ECSResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ECS> {
    _id?: _idResolver<string, TypeParent, TContext>;

    _index?: _indexResolver<Maybe<string>, TypeParent, TContext>;

    auditd?: auditdResolver<Maybe<AuditdEcsFields>, TypeParent, TContext>;

    destination?: destinationResolver<Maybe<DestinationEcsFields>, TypeParent, TContext>;

    event?: eventResolver<Maybe<EventEcsFields>, TypeParent, TContext>;

    geo?: geoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    host?: hostResolver<Maybe<HostEcsFields>, TypeParent, TContext>;

    network?: networkResolver<Maybe<NetworkEcsField>, TypeParent, TContext>;

    source?: sourceResolver<Maybe<SourceEcsFields>, TypeParent, TContext>;

    suricata?: suricataResolver<Maybe<SuricataEcsFields>, TypeParent, TContext>;

    tls?: tlsResolver<Maybe<TlsEcsFields>, TypeParent, TContext>;

    zeek?: zeekResolver<Maybe<ZeekEcsFields>, TypeParent, TContext>;

    http?: httpResolver<Maybe<HttpEcsFields>, TypeParent, TContext>;

    url?: urlResolver<Maybe<UrlEcsFields>, TypeParent, TContext>;

    timestamp?: timestampResolver<Maybe<string>, TypeParent, TContext>;

    message?: messageResolver<Maybe<string[]>, TypeParent, TContext>;

    user?: userResolver<Maybe<UserEcsFields>, TypeParent, TContext>;

    process?: processResolver<Maybe<ProcessEcsFields>, TypeParent, TContext>;

    file?: fileResolver<Maybe<FileFields>, TypeParent, TContext>;

    system?: systemResolver<Maybe<SystemEcsField>, TypeParent, TContext>;
  }

  export type _idResolver<R = string, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type _indexResolver<R = Maybe<string>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type auditdResolver<
    R = Maybe<AuditdEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type destinationResolver<
    R = Maybe<DestinationEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type eventResolver<
    R = Maybe<EventEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type geoResolver<R = Maybe<GeoEcsFields>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type hostResolver<
    R = Maybe<HostEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type networkResolver<
    R = Maybe<NetworkEcsField>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sourceResolver<
    R = Maybe<SourceEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type suricataResolver<
    R = Maybe<SuricataEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type tlsResolver<R = Maybe<TlsEcsFields>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type zeekResolver<
    R = Maybe<ZeekEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type httpResolver<
    R = Maybe<HttpEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type urlResolver<R = Maybe<UrlEcsFields>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type timestampResolver<R = Maybe<string>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type messageResolver<R = Maybe<string[]>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type userResolver<
    R = Maybe<UserEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type processResolver<
    R = Maybe<ProcessEcsFields>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type fileResolver<R = Maybe<FileFields>, Parent = ECS, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type systemResolver<
    R = Maybe<SystemEcsField>,
    Parent = ECS,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuditdEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuditdEcsFields> {
    result?: resultResolver<Maybe<string[]>, TypeParent, TContext>;

    session?: sessionResolver<Maybe<string[]>, TypeParent, TContext>;

    data?: dataResolver<Maybe<AuditdData>, TypeParent, TContext>;

    summary?: summaryResolver<Maybe<Summary>, TypeParent, TContext>;

    sequence?: sequenceResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type resultResolver<
    R = Maybe<string[]>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sessionResolver<
    R = Maybe<string[]>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dataResolver<
    R = Maybe<AuditdData>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type summaryResolver<
    R = Maybe<Summary>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sequenceResolver<
    R = Maybe<string[]>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuditdDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuditdData> {
    acct?: acctResolver<Maybe<string[]>, TypeParent, TContext>;

    terminal?: terminalResolver<Maybe<string[]>, TypeParent, TContext>;

    op?: opResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type acctResolver<
    R = Maybe<string[]>,
    Parent = AuditdData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type terminalResolver<
    R = Maybe<string[]>,
    Parent = AuditdData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type opResolver<
    R = Maybe<string[]>,
    Parent = AuditdData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SummaryResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Summary> {
    actor?: actorResolver<Maybe<PrimarySecondary>, TypeParent, TContext>;

    object?: objectResolver<Maybe<PrimarySecondary>, TypeParent, TContext>;

    how?: howResolver<Maybe<string[]>, TypeParent, TContext>;

    message_type?: message_typeResolver<Maybe<string[]>, TypeParent, TContext>;

    sequence?: sequenceResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type actorResolver<
    R = Maybe<PrimarySecondary>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type objectResolver<
    R = Maybe<PrimarySecondary>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type howResolver<R = Maybe<string[]>, Parent = Summary, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type message_typeResolver<
    R = Maybe<string[]>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sequenceResolver<
    R = Maybe<string[]>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PrimarySecondaryResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PrimarySecondary> {
    primary?: primaryResolver<Maybe<string[]>, TypeParent, TContext>;

    secondary?: secondaryResolver<Maybe<string[]>, TypeParent, TContext>;

    type?: typeResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type primaryResolver<
    R = Maybe<string[]>,
    Parent = PrimarySecondary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type secondaryResolver<
    R = Maybe<string[]>,
    Parent = PrimarySecondary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type typeResolver<
    R = Maybe<string[]>,
    Parent = PrimarySecondary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DestinationEcsFields> {
    bytes?: bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    ip?: ipResolver<Maybe<string[]>, TypeParent, TContext>;

    port?: portResolver<Maybe<number[]>, TypeParent, TContext>;

    domain?: domainResolver<Maybe<string[]>, TypeParent, TContext>;

    geo?: geoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    packets?: packetsResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type bytesResolver<
    R = Maybe<number[]>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ipResolver<
    R = Maybe<string[]>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type portResolver<
    R = Maybe<number[]>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type domainResolver<
    R = Maybe<string[]>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type geoResolver<
    R = Maybe<GeoEcsFields>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetsResolver<
    R = Maybe<number[]>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EventEcsFields> {
    action?: actionResolver<Maybe<string[]>, TypeParent, TContext>;

    category?: categoryResolver<Maybe<string[]>, TypeParent, TContext>;

    created?: createdResolver<Maybe<string[]>, TypeParent, TContext>;

    dataset?: datasetResolver<Maybe<string[]>, TypeParent, TContext>;

    duration?: durationResolver<Maybe<number[]>, TypeParent, TContext>;

    end?: endResolver<Maybe<string[]>, TypeParent, TContext>;

    hash?: hashResolver<Maybe<string[]>, TypeParent, TContext>;

    id?: idResolver<Maybe<string[]>, TypeParent, TContext>;

    kind?: kindResolver<Maybe<string[]>, TypeParent, TContext>;

    module?: moduleResolver<Maybe<string[]>, TypeParent, TContext>;

    original?: originalResolver<Maybe<string[]>, TypeParent, TContext>;

    outcome?: outcomeResolver<Maybe<string[]>, TypeParent, TContext>;

    risk_score?: risk_scoreResolver<Maybe<number[]>, TypeParent, TContext>;

    risk_score_norm?: risk_score_normResolver<Maybe<number[]>, TypeParent, TContext>;

    severity?: severityResolver<Maybe<number[]>, TypeParent, TContext>;

    start?: startResolver<Maybe<string[]>, TypeParent, TContext>;

    timezone?: timezoneResolver<Maybe<string[]>, TypeParent, TContext>;

    type?: typeResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type actionResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type categoryResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type createdResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type datasetResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type durationResolver<
    R = Maybe<number[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type endResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hashResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type idResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type kindResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type moduleResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type originalResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type outcomeResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type risk_scoreResolver<
    R = Maybe<number[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type risk_score_normResolver<
    R = Maybe<number[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type severityResolver<
    R = Maybe<number[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type startResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timezoneResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type typeResolver<
    R = Maybe<string[]>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkEcsFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkEcsField> {
    bytes?: bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    community_id?: community_idResolver<Maybe<string[]>, TypeParent, TContext>;

    direction?: directionResolver<Maybe<string[]>, TypeParent, TContext>;

    packets?: packetsResolver<Maybe<number[]>, TypeParent, TContext>;

    protocol?: protocolResolver<Maybe<string[]>, TypeParent, TContext>;

    transport?: transportResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type bytesResolver<
    R = Maybe<number[]>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type community_idResolver<
    R = Maybe<string[]>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type directionResolver<
    R = Maybe<string[]>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetsResolver<
    R = Maybe<number[]>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type protocolResolver<
    R = Maybe<string[]>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type transportResolver<
    R = Maybe<string[]>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SuricataEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SuricataEcsFields> {
    eve?: eveResolver<Maybe<SuricataEveData>, TypeParent, TContext>;
  }

  export type eveResolver<
    R = Maybe<SuricataEveData>,
    Parent = SuricataEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SuricataEveDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SuricataEveData> {
    alert?: alertResolver<Maybe<SuricataAlertData>, TypeParent, TContext>;

    flow_id?: flow_idResolver<Maybe<number[]>, TypeParent, TContext>;

    proto?: protoResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type alertResolver<
    R = Maybe<SuricataAlertData>,
    Parent = SuricataEveData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type flow_idResolver<
    R = Maybe<number[]>,
    Parent = SuricataEveData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type protoResolver<
    R = Maybe<string[]>,
    Parent = SuricataEveData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SuricataAlertDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SuricataAlertData> {
    signature?: signatureResolver<Maybe<string[]>, TypeParent, TContext>;

    signature_id?: signature_idResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type signatureResolver<
    R = Maybe<string[]>,
    Parent = SuricataAlertData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type signature_idResolver<
    R = Maybe<number[]>,
    Parent = SuricataAlertData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsEcsFields> {
    client_certificate?: client_certificateResolver<
      Maybe<TlsClientCertificateData>,
      TypeParent,
      TContext
    >;

    fingerprints?: fingerprintsResolver<Maybe<TlsFingerprintsData>, TypeParent, TContext>;

    server_certificate?: server_certificateResolver<
      Maybe<TlsServerCertificateData>,
      TypeParent,
      TContext
    >;
  }

  export type client_certificateResolver<
    R = Maybe<TlsClientCertificateData>,
    Parent = TlsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type fingerprintsResolver<
    R = Maybe<TlsFingerprintsData>,
    Parent = TlsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type server_certificateResolver<
    R = Maybe<TlsServerCertificateData>,
    Parent = TlsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsClientCertificateDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsClientCertificateData> {
    fingerprint?: fingerprintResolver<Maybe<FingerprintData>, TypeParent, TContext>;
  }

  export type fingerprintResolver<
    R = Maybe<FingerprintData>,
    Parent = TlsClientCertificateData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FingerprintDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FingerprintData> {
    sha1?: sha1Resolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type sha1Resolver<
    R = Maybe<string[]>,
    Parent = FingerprintData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsFingerprintsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsFingerprintsData> {
    ja3?: ja3Resolver<Maybe<TlsJa3Data>, TypeParent, TContext>;
  }

  export type ja3Resolver<
    R = Maybe<TlsJa3Data>,
    Parent = TlsFingerprintsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsJa3DataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsJa3Data> {
    hash?: hashResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type hashResolver<
    R = Maybe<string[]>,
    Parent = TlsJa3Data,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsServerCertificateDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsServerCertificateData> {
    fingerprint?: fingerprintResolver<Maybe<FingerprintData>, TypeParent, TContext>;
  }

  export type fingerprintResolver<
    R = Maybe<FingerprintData>,
    Parent = TlsServerCertificateData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekEcsFields> {
    session_id?: session_idResolver<Maybe<string[]>, TypeParent, TContext>;

    connection?: connectionResolver<Maybe<ZeekConnectionData>, TypeParent, TContext>;

    notice?: noticeResolver<Maybe<ZeekNoticeData>, TypeParent, TContext>;

    dns?: dnsResolver<Maybe<ZeekDnsData>, TypeParent, TContext>;

    http?: httpResolver<Maybe<ZeekHttpData>, TypeParent, TContext>;

    files?: filesResolver<Maybe<ZeekFileData>, TypeParent, TContext>;

    ssl?: sslResolver<Maybe<ZeekSslData>, TypeParent, TContext>;
  }

  export type session_idResolver<
    R = Maybe<string[]>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type connectionResolver<
    R = Maybe<ZeekConnectionData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type noticeResolver<
    R = Maybe<ZeekNoticeData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dnsResolver<
    R = Maybe<ZeekDnsData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type httpResolver<
    R = Maybe<ZeekHttpData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filesResolver<
    R = Maybe<ZeekFileData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sslResolver<
    R = Maybe<ZeekSslData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekConnectionDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekConnectionData> {
    local_resp?: local_respResolver<Maybe<boolean[]>, TypeParent, TContext>;

    local_orig?: local_origResolver<Maybe<boolean[]>, TypeParent, TContext>;

    missed_bytes?: missed_bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    state?: stateResolver<Maybe<string[]>, TypeParent, TContext>;

    history?: historyResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type local_respResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type local_origResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type missed_bytesResolver<
    R = Maybe<number[]>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type stateResolver<
    R = Maybe<string[]>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type historyResolver<
    R = Maybe<string[]>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekNoticeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekNoticeData> {
    suppress_for?: suppress_forResolver<Maybe<number[]>, TypeParent, TContext>;

    msg?: msgResolver<Maybe<string[]>, TypeParent, TContext>;

    note?: noteResolver<Maybe<string[]>, TypeParent, TContext>;

    sub?: subResolver<Maybe<string[]>, TypeParent, TContext>;

    dst?: dstResolver<Maybe<string[]>, TypeParent, TContext>;

    dropped?: droppedResolver<Maybe<boolean[]>, TypeParent, TContext>;

    peer_descr?: peer_descrResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type suppress_forResolver<
    R = Maybe<number[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type msgResolver<
    R = Maybe<string[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type noteResolver<
    R = Maybe<string[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type subResolver<
    R = Maybe<string[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dstResolver<
    R = Maybe<string[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type droppedResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type peer_descrResolver<
    R = Maybe<string[]>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekDnsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekDnsData> {
    AA?: AAResolver<Maybe<boolean[]>, TypeParent, TContext>;

    qclass_name?: qclass_nameResolver<Maybe<string[]>, TypeParent, TContext>;

    RD?: RDResolver<Maybe<boolean[]>, TypeParent, TContext>;

    qtype_name?: qtype_nameResolver<Maybe<string[]>, TypeParent, TContext>;

    rejected?: rejectedResolver<Maybe<boolean[]>, TypeParent, TContext>;

    qtype?: qtypeResolver<Maybe<string[]>, TypeParent, TContext>;

    query?: queryResolver<Maybe<string[]>, TypeParent, TContext>;

    trans_id?: trans_idResolver<Maybe<number[]>, TypeParent, TContext>;

    qclass?: qclassResolver<Maybe<string[]>, TypeParent, TContext>;

    RA?: RAResolver<Maybe<boolean[]>, TypeParent, TContext>;

    TC?: TCResolver<Maybe<boolean[]>, TypeParent, TContext>;
  }

  export type AAResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type qclass_nameResolver<
    R = Maybe<string[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RDResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type qtype_nameResolver<
    R = Maybe<string[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type rejectedResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type qtypeResolver<
    R = Maybe<string[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type queryResolver<
    R = Maybe<string[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type trans_idResolver<
    R = Maybe<number[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type qclassResolver<
    R = Maybe<string[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RAResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TCResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekHttpDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekHttpData> {
    resp_mime_types?: resp_mime_typesResolver<Maybe<string[]>, TypeParent, TContext>;

    trans_depth?: trans_depthResolver<Maybe<string[]>, TypeParent, TContext>;

    status_msg?: status_msgResolver<Maybe<string[]>, TypeParent, TContext>;

    resp_fuids?: resp_fuidsResolver<Maybe<string[]>, TypeParent, TContext>;

    tags?: tagsResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type resp_mime_typesResolver<
    R = Maybe<string[]>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type trans_depthResolver<
    R = Maybe<string[]>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type status_msgResolver<
    R = Maybe<string[]>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type resp_fuidsResolver<
    R = Maybe<string[]>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type tagsResolver<
    R = Maybe<string[]>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekFileDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekFileData> {
    session_ids?: session_idsResolver<Maybe<string[]>, TypeParent, TContext>;

    timedout?: timedoutResolver<Maybe<boolean[]>, TypeParent, TContext>;

    local_orig?: local_origResolver<Maybe<boolean[]>, TypeParent, TContext>;

    tx_host?: tx_hostResolver<Maybe<string[]>, TypeParent, TContext>;

    source?: sourceResolver<Maybe<string[]>, TypeParent, TContext>;

    is_orig?: is_origResolver<Maybe<boolean[]>, TypeParent, TContext>;

    overflow_bytes?: overflow_bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    sha1?: sha1Resolver<Maybe<string[]>, TypeParent, TContext>;

    duration?: durationResolver<Maybe<number[]>, TypeParent, TContext>;

    depth?: depthResolver<Maybe<number[]>, TypeParent, TContext>;

    analyzers?: analyzersResolver<Maybe<string[]>, TypeParent, TContext>;

    mime_type?: mime_typeResolver<Maybe<string[]>, TypeParent, TContext>;

    rx_host?: rx_hostResolver<Maybe<string[]>, TypeParent, TContext>;

    total_bytes?: total_bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    fuid?: fuidResolver<Maybe<string[]>, TypeParent, TContext>;

    seen_bytes?: seen_bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    missing_bytes?: missing_bytesResolver<Maybe<number[]>, TypeParent, TContext>;

    md5?: md5Resolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type session_idsResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timedoutResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type local_origResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type tx_hostResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sourceResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type is_origResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type overflow_bytesResolver<
    R = Maybe<number[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sha1Resolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type durationResolver<
    R = Maybe<number[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type depthResolver<
    R = Maybe<number[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type analyzersResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type mime_typeResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type rx_hostResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type total_bytesResolver<
    R = Maybe<number[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type fuidResolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type seen_bytesResolver<
    R = Maybe<number[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type missing_bytesResolver<
    R = Maybe<number[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type md5Resolver<
    R = Maybe<string[]>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekSslDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekSslData> {
    cipher?: cipherResolver<Maybe<string[]>, TypeParent, TContext>;

    established?: establishedResolver<Maybe<boolean[]>, TypeParent, TContext>;

    resumed?: resumedResolver<Maybe<boolean[]>, TypeParent, TContext>;

    version?: versionResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type cipherResolver<
    R = Maybe<string[]>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type establishedResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type resumedResolver<
    R = Maybe<boolean[]>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = Maybe<string[]>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpEcsFields> {
    version?: versionResolver<Maybe<string[]>, TypeParent, TContext>;

    request?: requestResolver<Maybe<HttpRequestData>, TypeParent, TContext>;

    response?: responseResolver<Maybe<HttpResponseData>, TypeParent, TContext>;
  }

  export type versionResolver<
    R = Maybe<string[]>,
    Parent = HttpEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type requestResolver<
    R = Maybe<HttpRequestData>,
    Parent = HttpEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type responseResolver<
    R = Maybe<HttpResponseData>,
    Parent = HttpEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpRequestDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpRequestData> {
    method?: methodResolver<Maybe<string[]>, TypeParent, TContext>;

    body?: bodyResolver<Maybe<HttpBodyData>, TypeParent, TContext>;

    referrer?: referrerResolver<Maybe<string[]>, TypeParent, TContext>;

    bytes?: bytesResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type methodResolver<
    R = Maybe<string[]>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type bodyResolver<
    R = Maybe<HttpBodyData>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type referrerResolver<
    R = Maybe<string[]>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type bytesResolver<
    R = Maybe<number[]>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpBodyDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpBodyData> {
    content?: contentResolver<Maybe<string[]>, TypeParent, TContext>;

    bytes?: bytesResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type contentResolver<
    R = Maybe<string[]>,
    Parent = HttpBodyData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type bytesResolver<
    R = Maybe<number[]>,
    Parent = HttpBodyData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpResponseDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpResponseData> {
    status_code?: status_codeResolver<Maybe<number[]>, TypeParent, TContext>;

    body?: bodyResolver<Maybe<HttpBodyData>, TypeParent, TContext>;

    bytes?: bytesResolver<Maybe<number[]>, TypeParent, TContext>;
  }

  export type status_codeResolver<
    R = Maybe<number[]>,
    Parent = HttpResponseData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type bodyResolver<
    R = Maybe<HttpBodyData>,
    Parent = HttpResponseData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type bytesResolver<
    R = Maybe<number[]>,
    Parent = HttpResponseData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UrlEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UrlEcsFields> {
    domain?: domainResolver<Maybe<string[]>, TypeParent, TContext>;

    original?: originalResolver<Maybe<string[]>, TypeParent, TContext>;

    username?: usernameResolver<Maybe<string[]>, TypeParent, TContext>;

    password?: passwordResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type domainResolver<
    R = Maybe<string[]>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type originalResolver<
    R = Maybe<string[]>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type usernameResolver<
    R = Maybe<string[]>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type passwordResolver<
    R = Maybe<string[]>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ProcessEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ProcessEcsFields> {
    pid?: pidResolver<Maybe<number[]>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string[]>, TypeParent, TContext>;

    ppid?: ppidResolver<Maybe<number[]>, TypeParent, TContext>;

    args?: argsResolver<Maybe<string[]>, TypeParent, TContext>;

    executable?: executableResolver<Maybe<string[]>, TypeParent, TContext>;

    title?: titleResolver<Maybe<string[]>, TypeParent, TContext>;

    thread?: threadResolver<Maybe<Thread>, TypeParent, TContext>;

    working_directory?: working_directoryResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type pidResolver<
    R = Maybe<number[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ppidResolver<
    R = Maybe<number[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type argsResolver<
    R = Maybe<string[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type executableResolver<
    R = Maybe<string[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type titleResolver<
    R = Maybe<string[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type threadResolver<
    R = Maybe<Thread>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type working_directoryResolver<
    R = Maybe<string[]>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ThreadResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Thread> {
    id?: idResolver<Maybe<number[]>, TypeParent, TContext>;

    start?: startResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type idResolver<R = Maybe<number[]>, Parent = Thread, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type startResolver<
    R = Maybe<string[]>,
    Parent = Thread,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FileFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FileFields> {
    path?: pathResolver<Maybe<string[]>, TypeParent, TContext>;

    target_path?: target_pathResolver<Maybe<string[]>, TypeParent, TContext>;

    extension?: extensionResolver<Maybe<string[]>, TypeParent, TContext>;

    type?: typeResolver<Maybe<string[]>, TypeParent, TContext>;

    device?: deviceResolver<Maybe<string[]>, TypeParent, TContext>;

    inode?: inodeResolver<Maybe<string[]>, TypeParent, TContext>;

    uid?: uidResolver<Maybe<string[]>, TypeParent, TContext>;

    owner?: ownerResolver<Maybe<string[]>, TypeParent, TContext>;

    gid?: gidResolver<Maybe<string[]>, TypeParent, TContext>;

    group?: groupResolver<Maybe<string[]>, TypeParent, TContext>;

    mode?: modeResolver<Maybe<string[]>, TypeParent, TContext>;

    size?: sizeResolver<Maybe<number[]>, TypeParent, TContext>;

    mtime?: mtimeResolver<Maybe<string[]>, TypeParent, TContext>;

    ctime?: ctimeResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type pathResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type target_pathResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type extensionResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type typeResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type deviceResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inodeResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uidResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ownerResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type gidResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type groupResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type modeResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sizeResolver<
    R = Maybe<number[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type mtimeResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ctimeResolver<
    R = Maybe<string[]>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SystemEcsFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SystemEcsField> {
    audit?: auditResolver<Maybe<AuditEcsFields>, TypeParent, TContext>;

    auth?: authResolver<Maybe<AuthEcsFields>, TypeParent, TContext>;
  }

  export type auditResolver<
    R = Maybe<AuditEcsFields>,
    Parent = SystemEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authResolver<
    R = Maybe<AuthEcsFields>,
    Parent = SystemEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuditEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuditEcsFields> {
    package?: packageResolver<Maybe<PackageEcsFields>, TypeParent, TContext>;
  }

  export type packageResolver<
    R = Maybe<PackageEcsFields>,
    Parent = AuditEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PackageEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PackageEcsFields> {
    arch?: archResolver<Maybe<string[]>, TypeParent, TContext>;

    entity_id?: entity_idResolver<Maybe<string[]>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string[]>, TypeParent, TContext>;

    size?: sizeResolver<Maybe<number[]>, TypeParent, TContext>;

    summary?: summaryResolver<Maybe<string[]>, TypeParent, TContext>;

    version?: versionResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type archResolver<
    R = Maybe<string[]>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type entity_idResolver<
    R = Maybe<string[]>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string[]>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sizeResolver<
    R = Maybe<number[]>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type summaryResolver<
    R = Maybe<string[]>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = Maybe<string[]>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthEcsFields> {
    ssh?: sshResolver<Maybe<SshEcsFields>, TypeParent, TContext>;
  }

  export type sshResolver<
    R = Maybe<SshEcsFields>,
    Parent = AuthEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SshEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SshEcsFields> {
    method?: methodResolver<Maybe<string[]>, TypeParent, TContext>;

    signature?: signatureResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type methodResolver<
    R = Maybe<string[]>,
    Parent = SshEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type signatureResolver<
    R = Maybe<string[]>,
    Parent = SshEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PageInfoResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PageInfo> {
    endCursor?: endCursorResolver<Maybe<CursorType>, TypeParent, TContext>;

    hasNextPage?: hasNextPageResolver<Maybe<boolean>, TypeParent, TContext>;
  }

  export type endCursorResolver<
    R = Maybe<CursorType>,
    Parent = PageInfo,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hasNextPageResolver<
    R = Maybe<boolean>,
    Parent = PageInfo,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineDetailsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineDetailsData> {
    data?: dataResolver<Maybe<DetailItem[]>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type dataResolver<
    R = Maybe<DetailItem[]>,
    Parent = TimelineDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = TimelineDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DetailItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DetailItem> {
    field?: fieldResolver<string, TypeParent, TContext>;

    values?: valuesResolver<Maybe<string[]>, TypeParent, TContext>;

    originalValue?: originalValueResolver<Maybe<EsValue>, TypeParent, TContext>;
  }

  export type fieldResolver<R = string, Parent = DetailItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type valuesResolver<
    R = Maybe<string[]>,
    Parent = DetailItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type originalValueResolver<
    R = Maybe<EsValue>,
    Parent = DetailItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace LastEventTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = LastEventTimeData> {
    lastSeen?: lastSeenResolver<Maybe<string>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type lastSeenResolver<
    R = Maybe<string>,
    Parent = LastEventTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = LastEventTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EventsOverTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EventsOverTimeData> {
    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    eventsOverTime?: eventsOverTimeResolver<MatrixOverTimeHistogramData[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;
  }

  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = EventsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type eventsOverTimeResolver<
    R = MatrixOverTimeHistogramData[],
    Parent = EventsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = EventsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace MatrixOverTimeHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = MatrixOverTimeHistogramData> {
    x?: xResolver<number, TypeParent, TContext>;

    y?: yResolver<number, TypeParent, TContext>;

    g?: gResolver<string, TypeParent, TContext>;
  }

  export type xResolver<
    R = number,
    Parent = MatrixOverTimeHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type yResolver<
    R = number,
    Parent = MatrixOverTimeHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type gResolver<
    R = string,
    Parent = MatrixOverTimeHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostsData> {
    edges?: edgesResolver<HostsEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = HostsEdges[],
    Parent = HostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<R = number, Parent = HostsData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = HostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = HostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostsEdges> {
    node?: nodeResolver<HostItem, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<R = HostItem, Parent = HostsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type cursorResolver<
    R = CursorType,
    Parent = HostsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostItem> {
    _id?: _idResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: lastSeenResolver<Maybe<string>, TypeParent, TContext>;

    host?: hostResolver<Maybe<HostEcsFields>, TypeParent, TContext>;

    cloud?: cloudResolver<Maybe<CloudFields>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type _idResolver<R = Maybe<string>, Parent = HostItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type lastSeenResolver<
    R = Maybe<string>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hostResolver<
    R = Maybe<HostEcsFields>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cloudResolver<
    R = Maybe<CloudFields>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CloudFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CloudFields> {
    instance?: instanceResolver<Maybe<CloudInstance>, TypeParent, TContext>;

    machine?: machineResolver<Maybe<CloudMachine>, TypeParent, TContext>;

    provider?: providerResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;

    region?: regionResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;
  }

  export type instanceResolver<
    R = Maybe<CloudInstance>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type machineResolver<
    R = Maybe<CloudMachine>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type providerResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type regionResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CloudInstanceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CloudInstance> {
    id?: idResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;
  }

  export type idResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudInstance,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CloudMachineResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CloudMachine> {
    type?: typeResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;
  }

  export type typeResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudMachine,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FirstLastSeenHostResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FirstLastSeenHost> {
    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    firstSeen?: firstSeenResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: lastSeenResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = FirstLastSeenHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type firstSeenResolver<
    R = Maybe<string>,
    Parent = FirstLastSeenHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type lastSeenResolver<
    R = Maybe<string>,
    Parent = FirstLastSeenHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace IpOverviewDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = IpOverviewData> {
    client?: clientResolver<Maybe<Overview>, TypeParent, TContext>;

    destination?: destinationResolver<Maybe<Overview>, TypeParent, TContext>;

    host?: hostResolver<HostEcsFields, TypeParent, TContext>;

    server?: serverResolver<Maybe<Overview>, TypeParent, TContext>;

    source?: sourceResolver<Maybe<Overview>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type clientResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type destinationResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hostResolver<
    R = HostEcsFields,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type serverResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sourceResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OverviewResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Overview> {
    firstSeen?: firstSeenResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: lastSeenResolver<Maybe<string>, TypeParent, TContext>;

    autonomousSystem?: autonomousSystemResolver<AutonomousSystem, TypeParent, TContext>;

    geo?: geoResolver<GeoEcsFields, TypeParent, TContext>;
  }

  export type firstSeenResolver<
    R = Maybe<string>,
    Parent = Overview,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type lastSeenResolver<
    R = Maybe<string>,
    Parent = Overview,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type autonomousSystemResolver<
    R = AutonomousSystem,
    Parent = Overview,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type geoResolver<R = GeoEcsFields, Parent = Overview, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace AutonomousSystemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AutonomousSystem> {
    number?: numberResolver<Maybe<number>, TypeParent, TContext>;

    organization?: organizationResolver<Maybe<AutonomousSystemOrganization>, TypeParent, TContext>;
  }

  export type numberResolver<
    R = Maybe<number>,
    Parent = AutonomousSystem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type organizationResolver<
    R = Maybe<AutonomousSystemOrganization>,
    Parent = AutonomousSystem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AutonomousSystemOrganizationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AutonomousSystemOrganization> {
    name?: nameResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type nameResolver<
    R = Maybe<string>,
    Parent = AutonomousSystemOrganization,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DomainsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DomainsData> {
    edges?: edgesResolver<DomainsEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = DomainsEdges[],
    Parent = DomainsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = DomainsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = DomainsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = DomainsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DomainsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DomainsEdges> {
    node?: nodeResolver<DomainsNode, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<
    R = DomainsNode,
    Parent = DomainsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cursorResolver<
    R = CursorType,
    Parent = DomainsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DomainsNodeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DomainsNode> {
    _id?: _idResolver<Maybe<string>, TypeParent, TContext>;

    timestamp?: timestampResolver<Maybe<string>, TypeParent, TContext>;

    source?: sourceResolver<Maybe<DomainsItem>, TypeParent, TContext>;

    destination?: destinationResolver<Maybe<DomainsItem>, TypeParent, TContext>;

    client?: clientResolver<Maybe<DomainsItem>, TypeParent, TContext>;

    server?: serverResolver<Maybe<DomainsItem>, TypeParent, TContext>;

    network?: networkResolver<Maybe<DomainsNetworkField>, TypeParent, TContext>;
  }

  export type _idResolver<
    R = Maybe<string>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timestampResolver<
    R = Maybe<string>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sourceResolver<
    R = Maybe<DomainsItem>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type destinationResolver<
    R = Maybe<DomainsItem>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type clientResolver<
    R = Maybe<DomainsItem>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type serverResolver<
    R = Maybe<DomainsItem>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type networkResolver<
    R = Maybe<DomainsNetworkField>,
    Parent = DomainsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DomainsItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DomainsItem> {
    uniqueIpCount?: uniqueIpCountResolver<Maybe<number>, TypeParent, TContext>;

    domainName?: domainNameResolver<Maybe<string>, TypeParent, TContext>;

    firstSeen?: firstSeenResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: lastSeenResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type uniqueIpCountResolver<
    R = Maybe<number>,
    Parent = DomainsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type domainNameResolver<
    R = Maybe<string>,
    Parent = DomainsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type firstSeenResolver<
    R = Maybe<string>,
    Parent = DomainsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type lastSeenResolver<
    R = Maybe<string>,
    Parent = DomainsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DomainsNetworkFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DomainsNetworkField> {
    bytes?: bytesResolver<Maybe<number>, TypeParent, TContext>;

    packets?: packetsResolver<Maybe<number>, TypeParent, TContext>;

    transport?: transportResolver<Maybe<string>, TypeParent, TContext>;

    direction?: directionResolver<Maybe<NetworkDirectionEcs[]>, TypeParent, TContext>;
  }

  export type bytesResolver<
    R = Maybe<number>,
    Parent = DomainsNetworkField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetsResolver<
    R = Maybe<number>,
    Parent = DomainsNetworkField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type transportResolver<
    R = Maybe<string>,
    Parent = DomainsNetworkField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type directionResolver<
    R = Maybe<NetworkDirectionEcs[]>,
    Parent = DomainsNetworkField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsData> {
    edges?: edgesResolver<TlsEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<R = TlsEdges[], Parent = TlsData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type totalCountResolver<R = number, Parent = TlsData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = TlsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = TlsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsEdges> {
    node?: nodeResolver<TlsNode, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<R = TlsNode, Parent = TlsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type cursorResolver<R = CursorType, Parent = TlsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TlsNodeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsNode> {
    _id?: _idResolver<Maybe<string>, TypeParent, TContext>;

    timestamp?: timestampResolver<Maybe<string>, TypeParent, TContext>;

    alternativeNames?: alternativeNamesResolver<Maybe<string[]>, TypeParent, TContext>;

    notAfter?: notAfterResolver<Maybe<string[]>, TypeParent, TContext>;

    commonNames?: commonNamesResolver<Maybe<string[]>, TypeParent, TContext>;

    ja3?: ja3Resolver<Maybe<string[]>, TypeParent, TContext>;

    issuerNames?: issuerNamesResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type _idResolver<R = Maybe<string>, Parent = TlsNode, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type timestampResolver<
    R = Maybe<string>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type alternativeNamesResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type notAfterResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type commonNamesResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ja3Resolver<R = Maybe<string[]>, Parent = TlsNode, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type issuerNamesResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersData> {
    edges?: edgesResolver<UsersEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = UsersEdges[],
    Parent = UsersData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<R = number, Parent = UsersData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = UsersData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = UsersData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersEdges> {
    node?: nodeResolver<UsersNode, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<R = UsersNode, Parent = UsersEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type cursorResolver<
    R = CursorType,
    Parent = UsersEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersNodeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersNode> {
    _id?: _idResolver<Maybe<string>, TypeParent, TContext>;

    timestamp?: timestampResolver<Maybe<string>, TypeParent, TContext>;

    user?: userResolver<Maybe<UsersItem>, TypeParent, TContext>;
  }

  export type _idResolver<R = Maybe<string>, Parent = UsersNode, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type timestampResolver<
    R = Maybe<string>,
    Parent = UsersNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type userResolver<
    R = Maybe<UsersItem>,
    Parent = UsersNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersItem> {
    name?: nameResolver<Maybe<string>, TypeParent, TContext>;

    id?: idResolver<Maybe<string[]>, TypeParent, TContext>;

    groupId?: groupIdResolver<Maybe<string[]>, TypeParent, TContext>;

    groupName?: groupNameResolver<Maybe<string[]>, TypeParent, TContext>;

    count?: countResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type nameResolver<
    R = Maybe<string>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type idResolver<
    R = Maybe<string[]>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type groupIdResolver<
    R = Maybe<string[]>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type groupNameResolver<
    R = Maybe<string[]>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type countResolver<
    R = Maybe<number>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiNetworkDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiNetworkData> {
    networkEvents?: networkEventsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueFlowId?: uniqueFlowIdResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourcePrivateIps?: uniqueSourcePrivateIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourcePrivateIpsHistogram?: uniqueSourcePrivateIpsHistogramResolver<
      Maybe<KpiNetworkHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueDestinationPrivateIps?: uniqueDestinationPrivateIpsResolver<
      Maybe<number>,
      TypeParent,
      TContext
    >;

    uniqueDestinationPrivateIpsHistogram?: uniqueDestinationPrivateIpsHistogramResolver<
      Maybe<KpiNetworkHistogramData[]>,
      TypeParent,
      TContext
    >;

    dnsQueries?: dnsQueriesResolver<Maybe<number>, TypeParent, TContext>;

    tlsHandshakes?: tlsHandshakesResolver<Maybe<number>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type networkEventsResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueFlowIdResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueSourcePrivateIpsResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueSourcePrivateIpsHistogramResolver<
    R = Maybe<KpiNetworkHistogramData[]>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDestinationPrivateIpsResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDestinationPrivateIpsHistogramResolver<
    R = Maybe<KpiNetworkHistogramData[]>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dnsQueriesResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type tlsHandshakesResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiNetworkHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiNetworkHistogramData> {
    x?: xResolver<Maybe<number>, TypeParent, TContext>;

    y?: yResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type xResolver<
    R = Maybe<number>,
    Parent = KpiNetworkHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type yResolver<
    R = Maybe<number>,
    Parent = KpiNetworkHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiHostsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiHostsData> {
    hosts?: hostsResolver<Maybe<number>, TypeParent, TContext>;

    hostsHistogram?: hostsHistogramResolver<Maybe<KpiHostHistogramData[]>, TypeParent, TContext>;

    authSuccess?: authSuccessResolver<Maybe<number>, TypeParent, TContext>;

    authSuccessHistogram?: authSuccessHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    authFailure?: authFailureResolver<Maybe<number>, TypeParent, TContext>;

    authFailureHistogram?: authFailureHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueSourceIps?: uniqueSourceIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourceIpsHistogram?: uniqueSourceIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueDestinationIps?: uniqueDestinationIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueDestinationIpsHistogram?: uniqueDestinationIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type hostsResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hostsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authSuccessResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authSuccessHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authFailureResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authFailureHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueSourceIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueSourceIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDestinationIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDestinationIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiHostHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiHostHistogramData> {
    x?: xResolver<Maybe<number>, TypeParent, TContext>;

    y?: yResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type xResolver<
    R = Maybe<number>,
    Parent = KpiHostHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type yResolver<
    R = Maybe<number>,
    Parent = KpiHostHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiHostDetailsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiHostDetailsData> {
    authSuccess?: authSuccessResolver<Maybe<number>, TypeParent, TContext>;

    authSuccessHistogram?: authSuccessHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    authFailure?: authFailureResolver<Maybe<number>, TypeParent, TContext>;

    authFailureHistogram?: authFailureHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueSourceIps?: uniqueSourceIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourceIpsHistogram?: uniqueSourceIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueDestinationIps?: uniqueDestinationIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueDestinationIpsHistogram?: uniqueDestinationIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type authSuccessResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authSuccessHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authFailureResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type authFailureHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueSourceIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueSourceIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDestinationIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDestinationIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopNFlowDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopNFlowData> {
    edges?: edgesResolver<NetworkTopNFlowEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = NetworkTopNFlowEdges[],
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopNFlowEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopNFlowEdges> {
    node?: nodeResolver<NetworkTopNFlowItem, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<
    R = NetworkTopNFlowItem,
    Parent = NetworkTopNFlowEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cursorResolver<
    R = CursorType,
    Parent = NetworkTopNFlowEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopNFlowItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopNFlowItem> {
    _id?: _idResolver<Maybe<string>, TypeParent, TContext>;

    source?: sourceResolver<Maybe<TopNFlowItemSource>, TypeParent, TContext>;

    destination?: destinationResolver<Maybe<TopNFlowItemDestination>, TypeParent, TContext>;

    network?: networkResolver<Maybe<TopNFlowNetworkEcsField>, TypeParent, TContext>;
  }

  export type _idResolver<
    R = Maybe<string>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sourceResolver<
    R = Maybe<TopNFlowItemSource>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type destinationResolver<
    R = Maybe<TopNFlowItemDestination>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type networkResolver<
    R = Maybe<TopNFlowNetworkEcsField>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopNFlowItemSourceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopNFlowItemSource> {
    autonomous_system?: autonomous_systemResolver<
      Maybe<AutonomousSystemItem>,
      TypeParent,
      TContext
    >;

    domain?: domainResolver<Maybe<string[]>, TypeParent, TContext>;

    ip?: ipResolver<Maybe<string>, TypeParent, TContext>;

    location?: locationResolver<Maybe<GeoItem>, TypeParent, TContext>;

    flows?: flowsResolver<Maybe<number>, TypeParent, TContext>;

    destination_ips?: destination_ipsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type autonomous_systemResolver<
    R = Maybe<AutonomousSystemItem>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type domainResolver<
    R = Maybe<string[]>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ipResolver<
    R = Maybe<string>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type locationResolver<
    R = Maybe<GeoItem>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type flowsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type destination_ipsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AutonomousSystemItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AutonomousSystemItem> {
    name?: nameResolver<Maybe<string>, TypeParent, TContext>;

    number?: numberResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type nameResolver<
    R = Maybe<string>,
    Parent = AutonomousSystemItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type numberResolver<
    R = Maybe<number>,
    Parent = AutonomousSystemItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace GeoItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = GeoItem> {
    geo?: geoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    flowTarget?: flowTargetResolver<Maybe<FlowTarget>, TypeParent, TContext>;
  }

  export type geoResolver<
    R = Maybe<GeoEcsFields>,
    Parent = GeoItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type flowTargetResolver<
    R = Maybe<FlowTarget>,
    Parent = GeoItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopNFlowItemDestinationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopNFlowItemDestination> {
    autonomous_system?: autonomous_systemResolver<
      Maybe<AutonomousSystemItem>,
      TypeParent,
      TContext
    >;

    domain?: domainResolver<Maybe<string[]>, TypeParent, TContext>;

    ip?: ipResolver<Maybe<string>, TypeParent, TContext>;

    location?: locationResolver<Maybe<GeoItem>, TypeParent, TContext>;

    flows?: flowsResolver<Maybe<number>, TypeParent, TContext>;

    source_ips?: source_ipsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type autonomous_systemResolver<
    R = Maybe<AutonomousSystemItem>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type domainResolver<
    R = Maybe<string[]>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ipResolver<
    R = Maybe<string>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type locationResolver<
    R = Maybe<GeoItem>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type flowsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type source_ipsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopNFlowNetworkEcsFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopNFlowNetworkEcsField> {
    bytes_in?: bytes_inResolver<Maybe<number>, TypeParent, TContext>;

    bytes_out?: bytes_outResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type bytes_inResolver<
    R = Maybe<number>,
    Parent = TopNFlowNetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type bytes_outResolver<
    R = Maybe<number>,
    Parent = TopNFlowNetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkDnsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkDnsData> {
    edges?: edgesResolver<NetworkDnsEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = NetworkDnsEdges[],
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkDnsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkDnsEdges> {
    node?: nodeResolver<NetworkDnsItem, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<
    R = NetworkDnsItem,
    Parent = NetworkDnsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cursorResolver<
    R = CursorType,
    Parent = NetworkDnsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkDnsItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkDnsItem> {
    _id?: _idResolver<Maybe<string>, TypeParent, TContext>;

    dnsBytesIn?: dnsBytesInResolver<Maybe<number>, TypeParent, TContext>;

    dnsBytesOut?: dnsBytesOutResolver<Maybe<number>, TypeParent, TContext>;

    dnsName?: dnsNameResolver<Maybe<string>, TypeParent, TContext>;

    queryCount?: queryCountResolver<Maybe<number>, TypeParent, TContext>;

    uniqueDomains?: uniqueDomainsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type _idResolver<
    R = Maybe<string>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dnsBytesInResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dnsBytesOutResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dnsNameResolver<
    R = Maybe<string>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type queryCountResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type uniqueDomainsResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OverviewNetworkDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OverviewNetworkData> {
    auditbeatSocket?: auditbeatSocketResolver<Maybe<number>, TypeParent, TContext>;

    filebeatCisco?: filebeatCiscoResolver<Maybe<number>, TypeParent, TContext>;

    filebeatNetflow?: filebeatNetflowResolver<Maybe<number>, TypeParent, TContext>;

    filebeatPanw?: filebeatPanwResolver<Maybe<number>, TypeParent, TContext>;

    filebeatSuricata?: filebeatSuricataResolver<Maybe<number>, TypeParent, TContext>;

    filebeatZeek?: filebeatZeekResolver<Maybe<number>, TypeParent, TContext>;

    packetbeatDNS?: packetbeatDNSResolver<Maybe<number>, TypeParent, TContext>;

    packetbeatFlow?: packetbeatFlowResolver<Maybe<number>, TypeParent, TContext>;

    packetbeatTLS?: packetbeatTLSResolver<Maybe<number>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type auditbeatSocketResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filebeatCiscoResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filebeatNetflowResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filebeatPanwResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filebeatSuricataResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filebeatZeekResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetbeatDNSResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetbeatFlowResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type packetbeatTLSResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OverviewHostDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OverviewHostData> {
    auditbeatAuditd?: auditbeatAuditdResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatFIM?: auditbeatFIMResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatLogin?: auditbeatLoginResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatPackage?: auditbeatPackageResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatProcess?: auditbeatProcessResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatUser?: auditbeatUserResolver<Maybe<number>, TypeParent, TContext>;

    filebeatSystemModule?: filebeatSystemModuleResolver<Maybe<number>, TypeParent, TContext>;

    winlogbeat?: winlogbeatResolver<Maybe<number>, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type auditbeatAuditdResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type auditbeatFIMResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type auditbeatLoginResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type auditbeatPackageResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type auditbeatProcessResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type auditbeatUserResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type filebeatSystemModuleResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type winlogbeatResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UncommonProcessesDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UncommonProcessesData> {
    edges?: edgesResolver<UncommonProcessesEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = UncommonProcessesEdges[],
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfoPaginated,
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UncommonProcessesEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UncommonProcessesEdges> {
    node?: nodeResolver<UncommonProcessItem, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<
    R = UncommonProcessItem,
    Parent = UncommonProcessesEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type cursorResolver<
    R = CursorType,
    Parent = UncommonProcessesEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UncommonProcessItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UncommonProcessItem> {
    _id?: _idResolver<string, TypeParent, TContext>;

    instances?: instancesResolver<number, TypeParent, TContext>;

    process?: processResolver<ProcessEcsFields, TypeParent, TContext>;

    hosts?: hostsResolver<HostEcsFields[], TypeParent, TContext>;

    user?: userResolver<Maybe<UserEcsFields>, TypeParent, TContext>;
  }

  export type _idResolver<
    R = string,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type instancesResolver<
    R = number,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type processResolver<
    R = ProcessEcsFields,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type hostsResolver<
    R = HostEcsFields[],
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type userResolver<
    R = Maybe<UserEcsFields>,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SayMyNameResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SayMyName> {
    /** The id of the source */
    appName?: appNameResolver<string, TypeParent, TContext>;
  }

  export type appNameResolver<R = string, Parent = SayMyName, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineResult> {
    savedObjectId?: savedObjectIdResolver<string, TypeParent, TContext>;

    columns?: columnsResolver<Maybe<ColumnHeaderResult[]>, TypeParent, TContext>;

    dataProviders?: dataProvidersResolver<Maybe<DataProviderResult[]>, TypeParent, TContext>;

    dateRange?: dateRangeResolver<Maybe<DateRangePickerResult>, TypeParent, TContext>;

    description?: descriptionResolver<Maybe<string>, TypeParent, TContext>;

    eventIdToNoteIds?: eventIdToNoteIdsResolver<Maybe<NoteResult[]>, TypeParent, TContext>;

    favorite?: favoriteResolver<Maybe<FavoriteTimelineResult[]>, TypeParent, TContext>;

    kqlMode?: kqlModeResolver<Maybe<string>, TypeParent, TContext>;

    kqlQuery?: kqlQueryResolver<Maybe<SerializedFilterQueryResult>, TypeParent, TContext>;

    notes?: notesResolver<Maybe<NoteResult[]>, TypeParent, TContext>;

    noteIds?: noteIdsResolver<Maybe<string[]>, TypeParent, TContext>;

    pinnedEventIds?: pinnedEventIdsResolver<Maybe<string[]>, TypeParent, TContext>;

    pinnedEventsSaveObject?: pinnedEventsSaveObjectResolver<
      Maybe<PinnedEvent[]>,
      TypeParent,
      TContext
    >;

    title?: titleResolver<Maybe<string>, TypeParent, TContext>;

    sort?: sortResolver<Maybe<SortTimelineResult>, TypeParent, TContext>;

    created?: createdResolver<Maybe<number>, TypeParent, TContext>;

    createdBy?: createdByResolver<Maybe<string>, TypeParent, TContext>;

    updated?: updatedResolver<Maybe<number>, TypeParent, TContext>;

    updatedBy?: updatedByResolver<Maybe<string>, TypeParent, TContext>;

    version?: versionResolver<string, TypeParent, TContext>;
  }

  export type savedObjectIdResolver<
    R = string,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type columnsResolver<
    R = Maybe<ColumnHeaderResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dataProvidersResolver<
    R = Maybe<DataProviderResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type dateRangeResolver<
    R = Maybe<DateRangePickerResult>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type descriptionResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type eventIdToNoteIdsResolver<
    R = Maybe<NoteResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type favoriteResolver<
    R = Maybe<FavoriteTimelineResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type kqlModeResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type kqlQueryResolver<
    R = Maybe<SerializedFilterQueryResult>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type notesResolver<
    R = Maybe<NoteResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type noteIdsResolver<
    R = Maybe<string[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pinnedEventIdsResolver<
    R = Maybe<string[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pinnedEventsSaveObjectResolver<
    R = Maybe<PinnedEvent[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type titleResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sortResolver<
    R = Maybe<SortTimelineResult>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type createdResolver<
    R = Maybe<number>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type createdByResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type updatedResolver<
    R = Maybe<number>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type updatedByResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = string,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ColumnHeaderResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ColumnHeaderResult> {
    aggregatable?: aggregatableResolver<Maybe<boolean>, TypeParent, TContext>;

    category?: categoryResolver<Maybe<string>, TypeParent, TContext>;

    columnHeaderType?: columnHeaderTypeResolver<Maybe<string>, TypeParent, TContext>;

    description?: descriptionResolver<Maybe<string>, TypeParent, TContext>;

    example?: exampleResolver<Maybe<string>, TypeParent, TContext>;

    indexes?: indexesResolver<Maybe<string[]>, TypeParent, TContext>;

    id?: idResolver<Maybe<string>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string>, TypeParent, TContext>;

    placeholder?: placeholderResolver<Maybe<string>, TypeParent, TContext>;

    searchable?: searchableResolver<Maybe<boolean>, TypeParent, TContext>;

    type?: typeResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type aggregatableResolver<
    R = Maybe<boolean>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type categoryResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type columnHeaderTypeResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type descriptionResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type exampleResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type indexesResolver<
    R = Maybe<string[]>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type idResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type placeholderResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type searchableResolver<
    R = Maybe<boolean>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type typeResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DataProviderResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DataProviderResult> {
    id?: idResolver<Maybe<string>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string>, TypeParent, TContext>;

    enabled?: enabledResolver<Maybe<boolean>, TypeParent, TContext>;

    excluded?: excludedResolver<Maybe<boolean>, TypeParent, TContext>;

    kqlQuery?: kqlQueryResolver<Maybe<string>, TypeParent, TContext>;

    queryMatch?: queryMatchResolver<Maybe<QueryMatchResult>, TypeParent, TContext>;

    and?: andResolver<Maybe<DataProviderResult[]>, TypeParent, TContext>;
  }

  export type idResolver<
    R = Maybe<string>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type enabledResolver<
    R = Maybe<boolean>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type excludedResolver<
    R = Maybe<boolean>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type kqlQueryResolver<
    R = Maybe<string>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type queryMatchResolver<
    R = Maybe<QueryMatchResult>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type andResolver<
    R = Maybe<DataProviderResult[]>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace QueryMatchResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = QueryMatchResult> {
    field?: fieldResolver<Maybe<string>, TypeParent, TContext>;

    displayField?: displayFieldResolver<Maybe<string>, TypeParent, TContext>;

    value?: valueResolver<Maybe<string>, TypeParent, TContext>;

    displayValue?: displayValueResolver<Maybe<string>, TypeParent, TContext>;

    operator?: operatorResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type fieldResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type displayFieldResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type valueResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type displayValueResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type operatorResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DateRangePickerResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DateRangePickerResult> {
    start?: startResolver<Maybe<number>, TypeParent, TContext>;

    end?: endResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type startResolver<
    R = Maybe<number>,
    Parent = DateRangePickerResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type endResolver<
    R = Maybe<number>,
    Parent = DateRangePickerResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FavoriteTimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FavoriteTimelineResult> {
    fullName?: fullNameResolver<Maybe<string>, TypeParent, TContext>;

    userName?: userNameResolver<Maybe<string>, TypeParent, TContext>;

    favoriteDate?: favoriteDateResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type fullNameResolver<
    R = Maybe<string>,
    Parent = FavoriteTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type userNameResolver<
    R = Maybe<string>,
    Parent = FavoriteTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type favoriteDateResolver<
    R = Maybe<number>,
    Parent = FavoriteTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SerializedFilterQueryResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SerializedFilterQueryResult> {
    filterQuery?: filterQueryResolver<Maybe<SerializedKueryQueryResult>, TypeParent, TContext>;
  }

  export type filterQueryResolver<
    R = Maybe<SerializedKueryQueryResult>,
    Parent = SerializedFilterQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SerializedKueryQueryResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SerializedKueryQueryResult> {
    kuery?: kueryResolver<Maybe<KueryFilterQueryResult>, TypeParent, TContext>;

    serializedQuery?: serializedQueryResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type kueryResolver<
    R = Maybe<KueryFilterQueryResult>,
    Parent = SerializedKueryQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type serializedQueryResolver<
    R = Maybe<string>,
    Parent = SerializedKueryQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KueryFilterQueryResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KueryFilterQueryResult> {
    kind?: kindResolver<Maybe<string>, TypeParent, TContext>;

    expression?: expressionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type kindResolver<
    R = Maybe<string>,
    Parent = KueryFilterQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type expressionResolver<
    R = Maybe<string>,
    Parent = KueryFilterQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SortTimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SortTimelineResult> {
    columnId?: columnIdResolver<Maybe<string>, TypeParent, TContext>;

    sortDirection?: sortDirectionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type columnIdResolver<
    R = Maybe<string>,
    Parent = SortTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type sortDirectionResolver<
    R = Maybe<string>,
    Parent = SortTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseTimelinesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseTimelines> {
    timeline?: timelineResolver<(Maybe<TimelineResult>)[], TypeParent, TContext>;

    totalCount?: totalCountResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type timelineResolver<
    R = (Maybe<TimelineResult>)[],
    Parent = ResponseTimelines,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = Maybe<number>,
    Parent = ResponseTimelines,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace MutationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = {}> {
    /** Persists a note */
    persistNote?: persistNoteResolver<ResponseNote, TypeParent, TContext>;

    deleteNote?: deleteNoteResolver<Maybe<boolean>, TypeParent, TContext>;

    deleteNoteByTimelineId?: deleteNoteByTimelineIdResolver<Maybe<boolean>, TypeParent, TContext>;
    /** Persists a pinned event in a timeline */
    persistPinnedEventOnTimeline?: persistPinnedEventOnTimelineResolver<
      Maybe<PinnedEvent>,
      TypeParent,
      TContext
    >;
    /** Remove a pinned events in a timeline */
    deletePinnedEventOnTimeline?: deletePinnedEventOnTimelineResolver<
      boolean,
      TypeParent,
      TContext
    >;
    /** Remove all pinned events in a timeline */
    deleteAllPinnedEventsOnTimeline?: deleteAllPinnedEventsOnTimelineResolver<
      boolean,
      TypeParent,
      TContext
    >;
    /** Persists a timeline */
    persistTimeline?: persistTimelineResolver<ResponseTimeline, TypeParent, TContext>;

    persistFavorite?: persistFavoriteResolver<ResponseFavoriteTimeline, TypeParent, TContext>;

    deleteTimeline?: deleteTimelineResolver<boolean, TypeParent, TContext>;
  }

  export type persistNoteResolver<R = ResponseNote, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    persistNoteArgs
  >;
  export interface persistNoteArgs {
    noteId?: Maybe<string>;

    version?: Maybe<string>;

    note: NoteInput;
  }

  export type deleteNoteResolver<
    R = Maybe<boolean>,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, deleteNoteArgs>;
  export interface deleteNoteArgs {
    id: string[];
  }

  export type deleteNoteByTimelineIdResolver<
    R = Maybe<boolean>,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, deleteNoteByTimelineIdArgs>;
  export interface deleteNoteByTimelineIdArgs {
    timelineId: string;

    version?: Maybe<string>;
  }

  export type persistPinnedEventOnTimelineResolver<
    R = Maybe<PinnedEvent>,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, persistPinnedEventOnTimelineArgs>;
  export interface persistPinnedEventOnTimelineArgs {
    pinnedEventId?: Maybe<string>;

    eventId: string;

    timelineId?: Maybe<string>;
  }

  export type deletePinnedEventOnTimelineResolver<
    R = boolean,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, deletePinnedEventOnTimelineArgs>;
  export interface deletePinnedEventOnTimelineArgs {
    id: string[];
  }

  export type deleteAllPinnedEventsOnTimelineResolver<
    R = boolean,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, deleteAllPinnedEventsOnTimelineArgs>;
  export interface deleteAllPinnedEventsOnTimelineArgs {
    timelineId: string;
  }

  export type persistTimelineResolver<
    R = ResponseTimeline,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, persistTimelineArgs>;
  export interface persistTimelineArgs {
    id?: Maybe<string>;

    version?: Maybe<string>;

    timeline: TimelineInput;
  }

  export type persistFavoriteResolver<
    R = ResponseFavoriteTimeline,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, persistFavoriteArgs>;
  export interface persistFavoriteArgs {
    timelineId?: Maybe<string>;
  }

  export type deleteTimelineResolver<R = boolean, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    deleteTimelineArgs
  >;
  export interface deleteTimelineArgs {
    id: string[];
  }
}

export namespace ResponseNoteResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseNote> {
    code?: codeResolver<Maybe<number>, TypeParent, TContext>;

    message?: messageResolver<Maybe<string>, TypeParent, TContext>;

    note?: noteResolver<NoteResult, TypeParent, TContext>;
  }

  export type codeResolver<
    R = Maybe<number>,
    Parent = ResponseNote,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type messageResolver<
    R = Maybe<string>,
    Parent = ResponseNote,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type noteResolver<
    R = NoteResult,
    Parent = ResponseNote,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseTimelineResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseTimeline> {
    code?: codeResolver<Maybe<number>, TypeParent, TContext>;

    message?: messageResolver<Maybe<string>, TypeParent, TContext>;

    timeline?: timelineResolver<TimelineResult, TypeParent, TContext>;
  }

  export type codeResolver<
    R = Maybe<number>,
    Parent = ResponseTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type messageResolver<
    R = Maybe<string>,
    Parent = ResponseTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type timelineResolver<
    R = TimelineResult,
    Parent = ResponseTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseFavoriteTimelineResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseFavoriteTimeline> {
    code?: codeResolver<Maybe<number>, TypeParent, TContext>;

    message?: messageResolver<Maybe<string>, TypeParent, TContext>;

    savedObjectId?: savedObjectIdResolver<string, TypeParent, TContext>;

    version?: versionResolver<string, TypeParent, TContext>;

    favorite?: favoriteResolver<Maybe<FavoriteTimelineResult[]>, TypeParent, TContext>;
  }

  export type codeResolver<
    R = Maybe<number>,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type messageResolver<
    R = Maybe<string>,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type savedObjectIdResolver<
    R = string,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = string,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type favoriteResolver<
    R = Maybe<FavoriteTimelineResult[]>,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EcsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EcsEdges> {
    node?: nodeResolver<ECS, TypeParent, TContext>;

    cursor?: cursorResolver<CursorType, TypeParent, TContext>;
  }

  export type nodeResolver<R = ECS, Parent = EcsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type cursorResolver<R = CursorType, Parent = EcsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace EventsTimelineDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EventsTimelineData> {
    edges?: edgesResolver<EcsEdges[], TypeParent, TContext>;

    totalCount?: totalCountResolver<number, TypeParent, TContext>;

    pageInfo?: pageInfoResolver<PageInfo, TypeParent, TContext>;

    inspect?: inspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type edgesResolver<
    R = EcsEdges[],
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type totalCountResolver<
    R = number,
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type pageInfoResolver<
    R = PageInfo,
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type inspectResolver<
    R = Maybe<Inspect>,
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OsFields> {
    platform?: platformResolver<Maybe<string>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string>, TypeParent, TContext>;

    full?: fullResolver<Maybe<string>, TypeParent, TContext>;

    family?: familyResolver<Maybe<string>, TypeParent, TContext>;

    version?: versionResolver<Maybe<string>, TypeParent, TContext>;

    kernel?: kernelResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type platformResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<R = Maybe<string>, Parent = OsFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type fullResolver<R = Maybe<string>, Parent = OsFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type familyResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type versionResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type kernelResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostFields> {
    architecture?: architectureResolver<Maybe<string>, TypeParent, TContext>;

    id?: idResolver<Maybe<string>, TypeParent, TContext>;

    ip?: ipResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;

    mac?: macResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;

    name?: nameResolver<Maybe<string>, TypeParent, TContext>;

    os?: osResolver<Maybe<OsFields>, TypeParent, TContext>;

    type?: typeResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type architectureResolver<
    R = Maybe<string>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type idResolver<R = Maybe<string>, Parent = HostFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ipResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type macResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type nameResolver<
    R = Maybe<string>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type osResolver<
    R = Maybe<OsFields>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type typeResolver<
    R = Maybe<string>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

/** Directs the executor to skip this field or fragment when the `if` argument is true. */
export type skipDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  skipDirectiveArgs,
  SiemContext
>;
export interface skipDirectiveArgs {
  /** Skipped when true. */
  if: boolean;
}

/** Directs the executor to include this field or fragment only when the `if` argument is true. */
export type includeDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  includeDirectiveArgs,
  SiemContext
>;
export interface includeDirectiveArgs {
  /** Included when true. */
  if: boolean;
}

/** Marks an element of a GraphQL schema as no longer supported. */
export type deprecatedDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  deprecatedDirectiveArgs,
  SiemContext
>;
export interface deprecatedDirectiveArgs {
  /** Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted in [Markdown](https://daringfireball.net/projects/markdown/). */
  reason?: string;
}

export interface ToStringArrayScalarConfig extends GraphQLScalarTypeConfig<ToStringArray, any> {
  name: 'ToStringArray';
}
export interface DateScalarConfig extends GraphQLScalarTypeConfig<Date, any> {
  name: 'Date';
}
export interface ToNumberArrayScalarConfig extends GraphQLScalarTypeConfig<ToNumberArray, any> {
  name: 'ToNumberArray';
}
export interface ToDateArrayScalarConfig extends GraphQLScalarTypeConfig<ToDateArray, any> {
  name: 'ToDateArray';
}
export interface ToBooleanArrayScalarConfig extends GraphQLScalarTypeConfig<ToBooleanArray, any> {
  name: 'ToBooleanArray';
}
export interface EsValueScalarConfig extends GraphQLScalarTypeConfig<EsValue, any> {
  name: 'EsValue';
}

export type IResolvers<TContext = SiemContext> = {
  Query?: QueryResolvers.Resolvers<TContext>;
  NoteResult?: NoteResultResolvers.Resolvers<TContext>;
  ResponseNotes?: ResponseNotesResolvers.Resolvers<TContext>;
  PinnedEvent?: PinnedEventResolvers.Resolvers<TContext>;
  Source?: SourceResolvers.Resolvers<TContext>;
  SourceConfiguration?: SourceConfigurationResolvers.Resolvers<TContext>;
  SourceFields?: SourceFieldsResolvers.Resolvers<TContext>;
  SourceStatus?: SourceStatusResolvers.Resolvers<TContext>;
  IndexField?: IndexFieldResolvers.Resolvers<TContext>;
  AuthenticationsData?: AuthenticationsDataResolvers.Resolvers<TContext>;
  AuthenticationsEdges?: AuthenticationsEdgesResolvers.Resolvers<TContext>;
  AuthenticationItem?: AuthenticationItemResolvers.Resolvers<TContext>;
  UserEcsFields?: UserEcsFieldsResolvers.Resolvers<TContext>;
  LastSourceHost?: LastSourceHostResolvers.Resolvers<TContext>;
  SourceEcsFields?: SourceEcsFieldsResolvers.Resolvers<TContext>;
  GeoEcsFields?: GeoEcsFieldsResolvers.Resolvers<TContext>;
  Location?: LocationResolvers.Resolvers<TContext>;
  HostEcsFields?: HostEcsFieldsResolvers.Resolvers<TContext>;
  OsEcsFields?: OsEcsFieldsResolvers.Resolvers<TContext>;
  CursorType?: CursorTypeResolvers.Resolvers<TContext>;
  PageInfoPaginated?: PageInfoPaginatedResolvers.Resolvers<TContext>;
  Inspect?: InspectResolvers.Resolvers<TContext>;
  TimelineData?: TimelineDataResolvers.Resolvers<TContext>;
  TimelineEdges?: TimelineEdgesResolvers.Resolvers<TContext>;
  TimelineItem?: TimelineItemResolvers.Resolvers<TContext>;
  TimelineNonEcsData?: TimelineNonEcsDataResolvers.Resolvers<TContext>;
  ECS?: ECSResolvers.Resolvers<TContext>;
  AuditdEcsFields?: AuditdEcsFieldsResolvers.Resolvers<TContext>;
  AuditdData?: AuditdDataResolvers.Resolvers<TContext>;
  Summary?: SummaryResolvers.Resolvers<TContext>;
  PrimarySecondary?: PrimarySecondaryResolvers.Resolvers<TContext>;
  DestinationEcsFields?: DestinationEcsFieldsResolvers.Resolvers<TContext>;
  EventEcsFields?: EventEcsFieldsResolvers.Resolvers<TContext>;
  NetworkEcsField?: NetworkEcsFieldResolvers.Resolvers<TContext>;
  SuricataEcsFields?: SuricataEcsFieldsResolvers.Resolvers<TContext>;
  SuricataEveData?: SuricataEveDataResolvers.Resolvers<TContext>;
  SuricataAlertData?: SuricataAlertDataResolvers.Resolvers<TContext>;
  TlsEcsFields?: TlsEcsFieldsResolvers.Resolvers<TContext>;
  TlsClientCertificateData?: TlsClientCertificateDataResolvers.Resolvers<TContext>;
  FingerprintData?: FingerprintDataResolvers.Resolvers<TContext>;
  TlsFingerprintsData?: TlsFingerprintsDataResolvers.Resolvers<TContext>;
  TlsJa3Data?: TlsJa3DataResolvers.Resolvers<TContext>;
  TlsServerCertificateData?: TlsServerCertificateDataResolvers.Resolvers<TContext>;
  ZeekEcsFields?: ZeekEcsFieldsResolvers.Resolvers<TContext>;
  ZeekConnectionData?: ZeekConnectionDataResolvers.Resolvers<TContext>;
  ZeekNoticeData?: ZeekNoticeDataResolvers.Resolvers<TContext>;
  ZeekDnsData?: ZeekDnsDataResolvers.Resolvers<TContext>;
  ZeekHttpData?: ZeekHttpDataResolvers.Resolvers<TContext>;
  ZeekFileData?: ZeekFileDataResolvers.Resolvers<TContext>;
  ZeekSslData?: ZeekSslDataResolvers.Resolvers<TContext>;
  HttpEcsFields?: HttpEcsFieldsResolvers.Resolvers<TContext>;
  HttpRequestData?: HttpRequestDataResolvers.Resolvers<TContext>;
  HttpBodyData?: HttpBodyDataResolvers.Resolvers<TContext>;
  HttpResponseData?: HttpResponseDataResolvers.Resolvers<TContext>;
  UrlEcsFields?: UrlEcsFieldsResolvers.Resolvers<TContext>;
  ProcessEcsFields?: ProcessEcsFieldsResolvers.Resolvers<TContext>;
  Thread?: ThreadResolvers.Resolvers<TContext>;
  FileFields?: FileFieldsResolvers.Resolvers<TContext>;
  SystemEcsField?: SystemEcsFieldResolvers.Resolvers<TContext>;
  AuditEcsFields?: AuditEcsFieldsResolvers.Resolvers<TContext>;
  PackageEcsFields?: PackageEcsFieldsResolvers.Resolvers<TContext>;
  AuthEcsFields?: AuthEcsFieldsResolvers.Resolvers<TContext>;
  SshEcsFields?: SshEcsFieldsResolvers.Resolvers<TContext>;
  PageInfo?: PageInfoResolvers.Resolvers<TContext>;
  TimelineDetailsData?: TimelineDetailsDataResolvers.Resolvers<TContext>;
  DetailItem?: DetailItemResolvers.Resolvers<TContext>;
  LastEventTimeData?: LastEventTimeDataResolvers.Resolvers<TContext>;
  EventsOverTimeData?: EventsOverTimeDataResolvers.Resolvers<TContext>;
  MatrixOverTimeHistogramData?: MatrixOverTimeHistogramDataResolvers.Resolvers<TContext>;
  HostsData?: HostsDataResolvers.Resolvers<TContext>;
  HostsEdges?: HostsEdgesResolvers.Resolvers<TContext>;
  HostItem?: HostItemResolvers.Resolvers<TContext>;
  CloudFields?: CloudFieldsResolvers.Resolvers<TContext>;
  CloudInstance?: CloudInstanceResolvers.Resolvers<TContext>;
  CloudMachine?: CloudMachineResolvers.Resolvers<TContext>;
  FirstLastSeenHost?: FirstLastSeenHostResolvers.Resolvers<TContext>;
  IpOverviewData?: IpOverviewDataResolvers.Resolvers<TContext>;
  Overview?: OverviewResolvers.Resolvers<TContext>;
  AutonomousSystem?: AutonomousSystemResolvers.Resolvers<TContext>;
  AutonomousSystemOrganization?: AutonomousSystemOrganizationResolvers.Resolvers<TContext>;
  DomainsData?: DomainsDataResolvers.Resolvers<TContext>;
  DomainsEdges?: DomainsEdgesResolvers.Resolvers<TContext>;
  DomainsNode?: DomainsNodeResolvers.Resolvers<TContext>;
  DomainsItem?: DomainsItemResolvers.Resolvers<TContext>;
  DomainsNetworkField?: DomainsNetworkFieldResolvers.Resolvers<TContext>;
  TlsData?: TlsDataResolvers.Resolvers<TContext>;
  TlsEdges?: TlsEdgesResolvers.Resolvers<TContext>;
  TlsNode?: TlsNodeResolvers.Resolvers<TContext>;
  UsersData?: UsersDataResolvers.Resolvers<TContext>;
  UsersEdges?: UsersEdgesResolvers.Resolvers<TContext>;
  UsersNode?: UsersNodeResolvers.Resolvers<TContext>;
  UsersItem?: UsersItemResolvers.Resolvers<TContext>;
  KpiNetworkData?: KpiNetworkDataResolvers.Resolvers<TContext>;
  KpiNetworkHistogramData?: KpiNetworkHistogramDataResolvers.Resolvers<TContext>;
  KpiHostsData?: KpiHostsDataResolvers.Resolvers<TContext>;
  KpiHostHistogramData?: KpiHostHistogramDataResolvers.Resolvers<TContext>;
  KpiHostDetailsData?: KpiHostDetailsDataResolvers.Resolvers<TContext>;
  NetworkTopNFlowData?: NetworkTopNFlowDataResolvers.Resolvers<TContext>;
  NetworkTopNFlowEdges?: NetworkTopNFlowEdgesResolvers.Resolvers<TContext>;
  NetworkTopNFlowItem?: NetworkTopNFlowItemResolvers.Resolvers<TContext>;
  TopNFlowItemSource?: TopNFlowItemSourceResolvers.Resolvers<TContext>;
  AutonomousSystemItem?: AutonomousSystemItemResolvers.Resolvers<TContext>;
  GeoItem?: GeoItemResolvers.Resolvers<TContext>;
  TopNFlowItemDestination?: TopNFlowItemDestinationResolvers.Resolvers<TContext>;
  TopNFlowNetworkEcsField?: TopNFlowNetworkEcsFieldResolvers.Resolvers<TContext>;
  NetworkDnsData?: NetworkDnsDataResolvers.Resolvers<TContext>;
  NetworkDnsEdges?: NetworkDnsEdgesResolvers.Resolvers<TContext>;
  NetworkDnsItem?: NetworkDnsItemResolvers.Resolvers<TContext>;
  OverviewNetworkData?: OverviewNetworkDataResolvers.Resolvers<TContext>;
  OverviewHostData?: OverviewHostDataResolvers.Resolvers<TContext>;
  UncommonProcessesData?: UncommonProcessesDataResolvers.Resolvers<TContext>;
  UncommonProcessesEdges?: UncommonProcessesEdgesResolvers.Resolvers<TContext>;
  UncommonProcessItem?: UncommonProcessItemResolvers.Resolvers<TContext>;
  SayMyName?: SayMyNameResolvers.Resolvers<TContext>;
  TimelineResult?: TimelineResultResolvers.Resolvers<TContext>;
  ColumnHeaderResult?: ColumnHeaderResultResolvers.Resolvers<TContext>;
  DataProviderResult?: DataProviderResultResolvers.Resolvers<TContext>;
  QueryMatchResult?: QueryMatchResultResolvers.Resolvers<TContext>;
  DateRangePickerResult?: DateRangePickerResultResolvers.Resolvers<TContext>;
  FavoriteTimelineResult?: FavoriteTimelineResultResolvers.Resolvers<TContext>;
  SerializedFilterQueryResult?: SerializedFilterQueryResultResolvers.Resolvers<TContext>;
  SerializedKueryQueryResult?: SerializedKueryQueryResultResolvers.Resolvers<TContext>;
  KueryFilterQueryResult?: KueryFilterQueryResultResolvers.Resolvers<TContext>;
  SortTimelineResult?: SortTimelineResultResolvers.Resolvers<TContext>;
  ResponseTimelines?: ResponseTimelinesResolvers.Resolvers<TContext>;
  Mutation?: MutationResolvers.Resolvers<TContext>;
  ResponseNote?: ResponseNoteResolvers.Resolvers<TContext>;
  ResponseTimeline?: ResponseTimelineResolvers.Resolvers<TContext>;
  ResponseFavoriteTimeline?: ResponseFavoriteTimelineResolvers.Resolvers<TContext>;
  EcsEdges?: EcsEdgesResolvers.Resolvers<TContext>;
  EventsTimelineData?: EventsTimelineDataResolvers.Resolvers<TContext>;
  OsFields?: OsFieldsResolvers.Resolvers<TContext>;
  HostFields?: HostFieldsResolvers.Resolvers<TContext>;
  ToStringArray?: GraphQLScalarType;
  Date?: GraphQLScalarType;
  ToNumberArray?: GraphQLScalarType;
  ToDateArray?: GraphQLScalarType;
  ToBooleanArray?: GraphQLScalarType;
  EsValue?: GraphQLScalarType;
} & { [typeName: string]: never };

export type IDirectiveResolvers<Result> = {
  skip?: skipDirectiveResolver<Result>;
  include?: includeDirectiveResolver<Result>;
  deprecated?: deprecatedDirectiveResolver<Result>;
} & { [directiveName: string]: never };
