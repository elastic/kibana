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

export interface UsersSortField {
  field: UsersFields;

  direction: Direction;
}

export interface NetworkTopTablesSortField {
  field: NetworkTopTablesFields;

  direction: Direction;
}

export interface NetworkDnsSortField {
  field: NetworkDnsFields;

  direction: Direction;
}

export interface NetworkHttpSortField {
  direction: Direction;
}

export interface TlsSortField {
  field: TlsFields;

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

  filters?: Maybe<FilterTimelineInput[]>;

  kqlMode?: Maybe<string>;

  kqlQuery?: Maybe<SerializedFilterQueryInput>;

  title?: Maybe<string>;

  dateRange?: Maybe<DateRangePickerInput>;

  savedQueryId?: Maybe<string>;

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

export interface FilterTimelineInput {
  exists?: Maybe<string>;

  meta?: Maybe<FilterMetaTimelineInput>;

  match_all?: Maybe<string>;

  missing?: Maybe<string>;

  query?: Maybe<string>;

  range?: Maybe<string>;

  script?: Maybe<string>;
}

export interface FilterMetaTimelineInput {
  alias?: Maybe<string>;

  controlledBy?: Maybe<string>;

  disabled?: Maybe<boolean>;

  field?: Maybe<string>;

  formattedValue?: Maybe<string>;

  index?: Maybe<string>;

  key?: Maybe<string>;

  negate?: Maybe<boolean>;

  params?: Maybe<string>;

  type?: Maybe<string>;

  value?: Maybe<string>;
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

export enum UsersFields {
  name = 'name',
  count = 'count',
}

export enum FlowTarget {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source',
}

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

export enum NetworkTopTablesFields {
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

export enum TlsFields {
  _id = '_id',
}

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created',
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

export enum NetworkHttpFields {
  domains = 'domains',
  lastHost = 'lastHost',
  lastSourceIp = 'lastSourceIp',
  methods = 'methods',
  path = 'path',
  requestCount = 'requestCount',
  statuses = 'statuses',
}

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

export type ToStringArray = string[] | string;

export type Date = string;

export type ToNumberArray = number[] | number;

export type ToDateArray = string[] | string;

export type ToBooleanArray = boolean[] | boolean;

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

  AlertsHistogram: AlertsOverTimeData;

  AnomaliesHistogram: AnomaliesOverTimeData;
  /** Gets Authentication success and failures based on a timerange */
  Authentications: AuthenticationsData;

  AuthenticationsHistogram: AuthenticationsOverTimeData;

  Timeline: TimelineData;

  TimelineDetails: TimelineDetailsData;

  LastEventTime: LastEventTimeData;

  EventsHistogram: EventsOverTimeData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;

  HostOverview: HostItem;

  HostFirstLastSeen: FirstLastSeenHost;

  IpOverview?: Maybe<IpOverviewData>;

  Users: UsersData;

  KpiNetwork?: Maybe<KpiNetworkData>;

  KpiHosts: KpiHostsData;

  KpiHostDetails: KpiHostDetailsData;

  NetworkTopCountries: NetworkTopCountriesData;

  NetworkTopNFlow: NetworkTopNFlowData;

  NetworkDns: NetworkDnsData;

  NetworkHttp: NetworkHttpData;

  OverviewNetwork?: Maybe<OverviewNetworkData>;

  OverviewHost?: Maybe<OverviewHostData>;

  Tls: TlsData;
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

export interface AlertsOverTimeData {
  inspect?: Maybe<Inspect>;

  AlertsOverTimeByModule: MatrixOverTimeHistogramData[];

  totalCount: number;
}

export interface Inspect {
  dsl: string[];

  response: string[];
}

export interface MatrixOverTimeHistogramData {
  x: number;

  y: number;

  g: string;
}

export interface AnomaliesOverTimeData {
  inspect?: Maybe<Inspect>;

  AnomaliesOverTimeByModule: MatrixOverTimeHistogramData[];

  totalCount: number;
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
  domain?: Maybe<string[] | string>;

  id?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  full_name?: Maybe<string[] | string>;

  email?: Maybe<string[] | string>;

  hash?: Maybe<string[] | string>;

  group?: Maybe<string[] | string>;
}

export interface LastSourceHost {
  timestamp?: Maybe<string>;

  source?: Maybe<SourceEcsFields>;

  host?: Maybe<HostEcsFields>;
}

export interface SourceEcsFields {
  bytes?: Maybe<number[] | number>;

  ip?: Maybe<string[] | string>;

  port?: Maybe<number[] | number>;

  domain?: Maybe<string[] | string>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[] | number>;
}

export interface GeoEcsFields {
  city_name?: Maybe<string[] | string>;

  continent_name?: Maybe<string[] | string>;

  country_iso_code?: Maybe<string[] | string>;

  country_name?: Maybe<string[] | string>;

  location?: Maybe<Location>;

  region_iso_code?: Maybe<string[] | string>;

  region_name?: Maybe<string[] | string>;
}

export interface Location {
  lon?: Maybe<number[] | number>;

  lat?: Maybe<number[] | number>;
}

export interface HostEcsFields {
  architecture?: Maybe<string[] | string>;

  id?: Maybe<string[] | string>;

  ip?: Maybe<string[] | string>;

  mac?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  os?: Maybe<OsEcsFields>;

  type?: Maybe<string[] | string>;
}

export interface OsEcsFields {
  platform?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  full?: Maybe<string[] | string>;

  family?: Maybe<string[] | string>;

  version?: Maybe<string[] | string>;

  kernel?: Maybe<string[] | string>;
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

export interface AuthenticationsOverTimeData {
  inspect?: Maybe<Inspect>;

  AuthenticationsOverTimeByModule: MatrixOverTimeHistogramData[];

  totalCount: number;
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

  ecs: Ecs;
}

export interface TimelineNonEcsData {
  field: string;

  value?: Maybe<string[] | string>;
}

export interface Ecs {
  _id: string;

  _index?: Maybe<string>;

  auditd?: Maybe<AuditdEcsFields>;

  destination?: Maybe<DestinationEcsFields>;

  dns?: Maybe<DnsEcsFields>;

  endgame?: Maybe<EndgameEcsFields>;

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

  message?: Maybe<string[] | string>;

  user?: Maybe<UserEcsFields>;

  winlog?: Maybe<WinlogEcsFields>;

  process?: Maybe<ProcessEcsFields>;

  file?: Maybe<FileFields>;

  system?: Maybe<SystemEcsField>;
}

export interface AuditdEcsFields {
  result?: Maybe<string[] | string>;

  session?: Maybe<string[] | string>;

  data?: Maybe<AuditdData>;

  summary?: Maybe<Summary>;

  sequence?: Maybe<string[] | string>;
}

export interface AuditdData {
  acct?: Maybe<string[] | string>;

  terminal?: Maybe<string[] | string>;

  op?: Maybe<string[] | string>;
}

export interface Summary {
  actor?: Maybe<PrimarySecondary>;

  object?: Maybe<PrimarySecondary>;

  how?: Maybe<string[] | string>;

  message_type?: Maybe<string[] | string>;

  sequence?: Maybe<string[] | string>;
}

export interface PrimarySecondary {
  primary?: Maybe<string[] | string>;

  secondary?: Maybe<string[] | string>;

  type?: Maybe<string[] | string>;
}

export interface DestinationEcsFields {
  bytes?: Maybe<number[] | number>;

  ip?: Maybe<string[] | string>;

  port?: Maybe<number[] | number>;

  domain?: Maybe<string[] | string>;

  geo?: Maybe<GeoEcsFields>;

  packets?: Maybe<number[] | number>;
}

export interface DnsEcsFields {
  question?: Maybe<DnsQuestionData>;

  resolved_ip?: Maybe<string[] | string>;

  response_code?: Maybe<string[] | string>;
}

export interface DnsQuestionData {
  name?: Maybe<string[] | string>;

  type?: Maybe<string[] | string>;
}

export interface EndgameEcsFields {
  exit_code?: Maybe<number[] | number>;

  file_name?: Maybe<string[] | string>;

  file_path?: Maybe<string[] | string>;

  logon_type?: Maybe<number[] | number>;

  parent_process_name?: Maybe<string[] | string>;

  pid?: Maybe<number[] | number>;

  process_name?: Maybe<string[] | string>;

  subject_domain_name?: Maybe<string[] | string>;

  subject_logon_id?: Maybe<string[] | string>;

  subject_user_name?: Maybe<string[] | string>;

  target_domain_name?: Maybe<string[] | string>;

  target_logon_id?: Maybe<string[] | string>;

  target_user_name?: Maybe<string[] | string>;
}

export interface EventEcsFields {
  action?: Maybe<string[] | string>;

  category?: Maybe<string[] | string>;

  code?: Maybe<string[] | string>;

  created?: Maybe<string[] | string>;

  dataset?: Maybe<string[] | string>;

  duration?: Maybe<number[] | number>;

  end?: Maybe<string[] | string>;

  hash?: Maybe<string[] | string>;

  id?: Maybe<string[] | string>;

  kind?: Maybe<string[] | string>;

  module?: Maybe<string[] | string>;

  original?: Maybe<string[] | string>;

  outcome?: Maybe<string[] | string>;

  risk_score?: Maybe<number[] | number>;

  risk_score_norm?: Maybe<number[] | number>;

  severity?: Maybe<number[] | number>;

  start?: Maybe<string[] | string>;

  timezone?: Maybe<string[] | string>;

  type?: Maybe<string[] | string>;
}

export interface NetworkEcsField {
  bytes?: Maybe<number[] | number>;

  community_id?: Maybe<string[] | string>;

  direction?: Maybe<string[] | string>;

  packets?: Maybe<number[] | number>;

  protocol?: Maybe<string[] | string>;

  transport?: Maybe<string[] | string>;
}

export interface SuricataEcsFields {
  eve?: Maybe<SuricataEveData>;
}

export interface SuricataEveData {
  alert?: Maybe<SuricataAlertData>;

  flow_id?: Maybe<number[] | number>;

  proto?: Maybe<string[] | string>;
}

export interface SuricataAlertData {
  signature?: Maybe<string[] | string>;

  signature_id?: Maybe<number[] | number>;
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
  sha1?: Maybe<string[] | string>;
}

export interface TlsFingerprintsData {
  ja3?: Maybe<TlsJa3Data>;
}

export interface TlsJa3Data {
  hash?: Maybe<string[] | string>;
}

export interface TlsServerCertificateData {
  fingerprint?: Maybe<FingerprintData>;
}

export interface ZeekEcsFields {
  session_id?: Maybe<string[] | string>;

  connection?: Maybe<ZeekConnectionData>;

  notice?: Maybe<ZeekNoticeData>;

  dns?: Maybe<ZeekDnsData>;

  http?: Maybe<ZeekHttpData>;

  files?: Maybe<ZeekFileData>;

  ssl?: Maybe<ZeekSslData>;
}

export interface ZeekConnectionData {
  local_resp?: Maybe<boolean[] | boolean>;

  local_orig?: Maybe<boolean[] | boolean>;

  missed_bytes?: Maybe<number[] | number>;

  state?: Maybe<string[] | string>;

  history?: Maybe<string[] | string>;
}

export interface ZeekNoticeData {
  suppress_for?: Maybe<number[] | number>;

  msg?: Maybe<string[] | string>;

  note?: Maybe<string[] | string>;

  sub?: Maybe<string[] | string>;

  dst?: Maybe<string[] | string>;

  dropped?: Maybe<boolean[] | boolean>;

  peer_descr?: Maybe<string[] | string>;
}

export interface ZeekDnsData {
  AA?: Maybe<boolean[] | boolean>;

  qclass_name?: Maybe<string[] | string>;

  RD?: Maybe<boolean[] | boolean>;

  qtype_name?: Maybe<string[] | string>;

  rejected?: Maybe<boolean[] | boolean>;

  qtype?: Maybe<string[] | string>;

  query?: Maybe<string[] | string>;

  trans_id?: Maybe<number[] | number>;

  qclass?: Maybe<string[] | string>;

  RA?: Maybe<boolean[] | boolean>;

  TC?: Maybe<boolean[] | boolean>;
}

export interface ZeekHttpData {
  resp_mime_types?: Maybe<string[] | string>;

  trans_depth?: Maybe<string[] | string>;

  status_msg?: Maybe<string[] | string>;

  resp_fuids?: Maybe<string[] | string>;

  tags?: Maybe<string[] | string>;
}

export interface ZeekFileData {
  session_ids?: Maybe<string[] | string>;

  timedout?: Maybe<boolean[] | boolean>;

  local_orig?: Maybe<boolean[] | boolean>;

  tx_host?: Maybe<string[] | string>;

  source?: Maybe<string[] | string>;

  is_orig?: Maybe<boolean[] | boolean>;

  overflow_bytes?: Maybe<number[] | number>;

  sha1?: Maybe<string[] | string>;

  duration?: Maybe<number[] | number>;

  depth?: Maybe<number[] | number>;

  analyzers?: Maybe<string[] | string>;

  mime_type?: Maybe<string[] | string>;

  rx_host?: Maybe<string[] | string>;

  total_bytes?: Maybe<number[] | number>;

  fuid?: Maybe<string[] | string>;

  seen_bytes?: Maybe<number[] | number>;

  missing_bytes?: Maybe<number[] | number>;

  md5?: Maybe<string[] | string>;
}

export interface ZeekSslData {
  cipher?: Maybe<string[] | string>;

  established?: Maybe<boolean[] | boolean>;

  resumed?: Maybe<boolean[] | boolean>;

  version?: Maybe<string[] | string>;
}

export interface HttpEcsFields {
  version?: Maybe<string[] | string>;

  request?: Maybe<HttpRequestData>;

  response?: Maybe<HttpResponseData>;
}

export interface HttpRequestData {
  method?: Maybe<string[] | string>;

  body?: Maybe<HttpBodyData>;

  referrer?: Maybe<string[] | string>;

  bytes?: Maybe<number[] | number>;
}

export interface HttpBodyData {
  content?: Maybe<string[] | string>;

  bytes?: Maybe<number[] | number>;
}

export interface HttpResponseData {
  status_code?: Maybe<number[] | number>;

  body?: Maybe<HttpBodyData>;

  bytes?: Maybe<number[] | number>;
}

export interface UrlEcsFields {
  domain?: Maybe<string[] | string>;

  original?: Maybe<string[] | string>;

  username?: Maybe<string[] | string>;

  password?: Maybe<string[] | string>;
}

export interface WinlogEcsFields {
  event_id?: Maybe<number[] | number>;
}

export interface ProcessEcsFields {
  hash?: Maybe<ProcessHashData>;

  pid?: Maybe<number[] | number>;

  name?: Maybe<string[] | string>;

  ppid?: Maybe<number[] | number>;

  args?: Maybe<string[] | string>;

  executable?: Maybe<string[] | string>;

  title?: Maybe<string[] | string>;

  thread?: Maybe<Thread>;

  working_directory?: Maybe<string[] | string>;
}

export interface ProcessHashData {
  md5?: Maybe<string[] | string>;

  sha1?: Maybe<string[] | string>;

  sha256?: Maybe<string[] | string>;
}

export interface Thread {
  id?: Maybe<number[] | number>;

  start?: Maybe<string[] | string>;
}

export interface FileFields {
  name?: Maybe<string[] | string>;

  path?: Maybe<string[] | string>;

  target_path?: Maybe<string[] | string>;

  extension?: Maybe<string[] | string>;

  type?: Maybe<string[] | string>;

  device?: Maybe<string[] | string>;

  inode?: Maybe<string[] | string>;

  uid?: Maybe<string[] | string>;

  owner?: Maybe<string[] | string>;

  gid?: Maybe<string[] | string>;

  group?: Maybe<string[] | string>;

  mode?: Maybe<string[] | string>;

  size?: Maybe<number[] | number>;

  mtime?: Maybe<string[] | string>;

  ctime?: Maybe<string[] | string>;
}

export interface SystemEcsField {
  audit?: Maybe<AuditEcsFields>;

  auth?: Maybe<AuthEcsFields>;
}

export interface AuditEcsFields {
  package?: Maybe<PackageEcsFields>;
}

export interface PackageEcsFields {
  arch?: Maybe<string[] | string>;

  entity_id?: Maybe<string[] | string>;

  name?: Maybe<string[] | string>;

  size?: Maybe<number[] | number>;

  summary?: Maybe<string[] | string>;

  version?: Maybe<string[] | string>;
}

export interface AuthEcsFields {
  ssh?: Maybe<SshEcsFields>;
}

export interface SshEcsFields {
  method?: Maybe<string[] | string>;

  signature?: Maybe<string[] | string>;
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

  values?: Maybe<string[] | string>;

  originalValue?: Maybe<EsValue>;
}

export interface LastEventTimeData {
  lastSeen?: Maybe<string>;

  inspect?: Maybe<Inspect>;
}

export interface EventsOverTimeData {
  inspect?: Maybe<Inspect>;

  EventsOverTimeByModule: MatrixOverTimeHistogramData[];

  totalCount: number;
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

  id?: Maybe<string[] | string>;

  groupId?: Maybe<string[] | string>;

  groupName?: Maybe<string[] | string>;

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

export interface NetworkTopCountriesData {
  edges: NetworkTopCountriesEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface NetworkTopCountriesEdges {
  node: NetworkTopCountriesItem;

  cursor: CursorType;
}

export interface NetworkTopCountriesItem {
  _id?: Maybe<string>;

  source?: Maybe<TopCountriesItemSource>;

  destination?: Maybe<TopCountriesItemDestination>;

  network?: Maybe<TopNetworkTablesEcsField>;
}

export interface TopCountriesItemSource {
  country?: Maybe<string>;

  destination_ips?: Maybe<number>;

  flows?: Maybe<number>;

  location?: Maybe<GeoItem>;

  source_ips?: Maybe<number>;
}

export interface GeoItem {
  geo?: Maybe<GeoEcsFields>;

  flowTarget?: Maybe<FlowTargetSourceDest>;
}

export interface TopCountriesItemDestination {
  country?: Maybe<string>;

  destination_ips?: Maybe<number>;

  flows?: Maybe<number>;

  location?: Maybe<GeoItem>;

  source_ips?: Maybe<number>;
}

export interface TopNetworkTablesEcsField {
  bytes_in?: Maybe<number>;

  bytes_out?: Maybe<number>;
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

  network?: Maybe<TopNetworkTablesEcsField>;
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

export interface TopNFlowItemDestination {
  autonomous_system?: Maybe<AutonomousSystemItem>;

  domain?: Maybe<string[]>;

  ip?: Maybe<string>;

  location?: Maybe<GeoItem>;

  flows?: Maybe<number>;

  source_ips?: Maybe<number>;
}

export interface NetworkDnsData {
  edges: NetworkDnsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;

  histogram?: Maybe<MatrixOverOrdinalHistogramData[]>;
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

export interface MatrixOverOrdinalHistogramData {
  x: string;

  y: number;

  g: string;
}

export interface NetworkHttpData {
  edges: NetworkHttpEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface NetworkHttpEdges {
  node: NetworkHttpItem;

  cursor: CursorType;
}

export interface NetworkHttpItem {
  _id?: Maybe<string>;

  domains: string[];

  lastHost?: Maybe<string>;

  lastSourceIp?: Maybe<string>;

  methods: string[];

  path?: Maybe<string>;

  requestCount?: Maybe<number>;

  statuses: string[];
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

  endgameDns?: Maybe<number>;

  endgameFile?: Maybe<number>;

  endgameImageLoad?: Maybe<number>;

  endgameNetwork?: Maybe<number>;

  endgameProcess?: Maybe<number>;

  endgameRegistry?: Maybe<number>;

  endgameSecurity?: Maybe<number>;

  filebeatSystemModule?: Maybe<number>;

  winlogbeat?: Maybe<number>;

  inspect?: Maybe<Inspect>;
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
  columns?: Maybe<ColumnHeaderResult[]>;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  dataProviders?: Maybe<DataProviderResult[]>;

  dateRange?: Maybe<DateRangePickerResult>;

  description?: Maybe<string>;

  eventIdToNoteIds?: Maybe<NoteResult[]>;

  favorite?: Maybe<FavoriteTimelineResult[]>;

  filters?: Maybe<FilterTimelineResult[]>;

  kqlMode?: Maybe<string>;

  kqlQuery?: Maybe<SerializedFilterQueryResult>;

  notes?: Maybe<NoteResult[]>;

  noteIds?: Maybe<string[]>;

  pinnedEventIds?: Maybe<string[]>;

  pinnedEventsSaveObject?: Maybe<PinnedEvent[]>;

  savedQueryId?: Maybe<string>;

  savedObjectId: string;

  sort?: Maybe<SortTimelineResult>;

  title?: Maybe<string>;

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

export interface FilterTimelineResult {
  exists?: Maybe<string>;

  meta?: Maybe<FilterMetaTimelineResult>;

  match_all?: Maybe<string>;

  missing?: Maybe<string>;

  query?: Maybe<string>;

  range?: Maybe<string>;

  script?: Maybe<string>;
}

export interface FilterMetaTimelineResult {
  alias?: Maybe<string>;

  controlledBy?: Maybe<string>;

  disabled?: Maybe<boolean>;

  field?: Maybe<string>;

  formattedValue?: Maybe<string>;

  index?: Maybe<string>;

  key?: Maybe<string>;

  negate?: Maybe<boolean>;

  params?: Maybe<string>;

  type?: Maybe<string>;

  value?: Maybe<string>;
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
  node: Ecs;

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

export interface GetNoteQueryArgs {
  id: string;
}
export interface GetNotesByTimelineIdQueryArgs {
  timelineId: string;
}
export interface GetNotesByEventIdQueryArgs {
  eventId: string;
}
export interface GetAllNotesQueryArgs {
  pageInfo?: Maybe<PageInfoNote>;

  search?: Maybe<string>;

  sort?: Maybe<SortNote>;
}
export interface GetAllPinnedEventsByTimelineIdQueryArgs {
  timelineId: string;
}
export interface SourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface GetOneTimelineQueryArgs {
  id: string;
}
export interface GetAllTimelineQueryArgs {
  pageInfo?: Maybe<PageInfoTimeline>;

  search?: Maybe<string>;

  sort?: Maybe<SortTimeline>;

  onlyUserFavorite?: Maybe<boolean>;
}
export interface AlertsHistogramSourceArgs {
  filterQuery?: Maybe<string>;

  defaultIndex: string[];

  timerange: TimerangeInput;
}
export interface AnomaliesHistogramSourceArgs {
  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface AuthenticationsSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInputPaginated;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface AuthenticationsHistogramSourceArgs {
  timerange: TimerangeInput;

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
export interface EventsHistogramSourceArgs {
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
export interface NetworkTopCountriesSourceArgs {
  id?: Maybe<string>;

  filterQuery?: Maybe<string>;

  ip?: Maybe<string>;

  flowTarget: FlowTargetSourceDest;

  pagination: PaginationInputPaginated;

  sort: NetworkTopTablesSortField;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface NetworkTopNFlowSourceArgs {
  id?: Maybe<string>;

  filterQuery?: Maybe<string>;

  ip?: Maybe<string>;

  flowTarget: FlowTargetSourceDest;

  pagination: PaginationInputPaginated;

  sort: NetworkTopTablesSortField;

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
export interface NetworkHttpSourceArgs {
  id?: Maybe<string>;

  filterQuery?: Maybe<string>;

  ip?: Maybe<string>;

  pagination: PaginationInputPaginated;

  sort: NetworkHttpSortField;

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
export interface TlsSourceArgs {
  filterQuery?: Maybe<string>;

  id?: Maybe<string>;

  ip: string;

  pagination: PaginationInputPaginated;

  sort: TlsSortField;

  flowTarget: FlowTargetSourceDest;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface UncommonProcessesSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInputPaginated;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];
}
export interface IndicesExistSourceStatusArgs {
  defaultIndex: string[];
}
export interface IndexFieldsSourceStatusArgs {
  defaultIndex: string[];
}
export interface PersistNoteMutationArgs {
  noteId?: Maybe<string>;

  version?: Maybe<string>;

  note: NoteInput;
}
export interface DeleteNoteMutationArgs {
  id: string[];
}
export interface DeleteNoteByTimelineIdMutationArgs {
  timelineId: string;

  version?: Maybe<string>;
}
export interface PersistPinnedEventOnTimelineMutationArgs {
  pinnedEventId?: Maybe<string>;

  eventId: string;

  timelineId?: Maybe<string>;
}
export interface DeletePinnedEventOnTimelineMutationArgs {
  id: string[];
}
export interface DeleteAllPinnedEventsOnTimelineMutationArgs {
  timelineId: string;
}
export interface PersistTimelineMutationArgs {
  id?: Maybe<string>;

  version?: Maybe<string>;

  timeline: TimelineInput;
}
export interface PersistFavoriteMutationArgs {
  timelineId?: Maybe<string>;
}
export interface DeleteTimelineMutationArgs {
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
    getNote?: GetNoteResolver<NoteResult, TypeParent, TContext>;

    getNotesByTimelineId?: GetNotesByTimelineIdResolver<NoteResult[], TypeParent, TContext>;

    getNotesByEventId?: GetNotesByEventIdResolver<NoteResult[], TypeParent, TContext>;

    getAllNotes?: GetAllNotesResolver<ResponseNotes, TypeParent, TContext>;

    getAllPinnedEventsByTimelineId?: GetAllPinnedEventsByTimelineIdResolver<
      PinnedEvent[],
      TypeParent,
      TContext
    >;
    /** Get a security data source by id */
    source?: SourceResolver<Source, TypeParent, TContext>;
    /** Get a list of all security data sources */
    allSources?: AllSourcesResolver<Source[], TypeParent, TContext>;

    getOneTimeline?: GetOneTimelineResolver<TimelineResult, TypeParent, TContext>;

    getAllTimeline?: GetAllTimelineResolver<ResponseTimelines, TypeParent, TContext>;
  }

  export type GetNoteResolver<R = NoteResult, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    GetNoteArgs
  >;
  export interface GetNoteArgs {
    id: string;
  }

  export type GetNotesByTimelineIdResolver<
    R = NoteResult[],
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, GetNotesByTimelineIdArgs>;
  export interface GetNotesByTimelineIdArgs {
    timelineId: string;
  }

  export type GetNotesByEventIdResolver<
    R = NoteResult[],
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, GetNotesByEventIdArgs>;
  export interface GetNotesByEventIdArgs {
    eventId: string;
  }

  export type GetAllNotesResolver<
    R = ResponseNotes,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, GetAllNotesArgs>;
  export interface GetAllNotesArgs {
    pageInfo?: Maybe<PageInfoNote>;

    search?: Maybe<string>;

    sort?: Maybe<SortNote>;
  }

  export type GetAllPinnedEventsByTimelineIdResolver<
    R = PinnedEvent[],
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, GetAllPinnedEventsByTimelineIdArgs>;
  export interface GetAllPinnedEventsByTimelineIdArgs {
    timelineId: string;
  }

  export type SourceResolver<R = Source, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    SourceArgs
  >;
  export interface SourceArgs {
    /** The id of the source */
    id: string;
  }

  export type AllSourcesResolver<R = Source[], Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type GetOneTimelineResolver<
    R = TimelineResult,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, GetOneTimelineArgs>;
  export interface GetOneTimelineArgs {
    id: string;
  }

  export type GetAllTimelineResolver<
    R = ResponseTimelines,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, GetAllTimelineArgs>;
  export interface GetAllTimelineArgs {
    pageInfo?: Maybe<PageInfoTimeline>;

    search?: Maybe<string>;

    sort?: Maybe<SortTimeline>;

    onlyUserFavorite?: Maybe<boolean>;
  }
}

export namespace NoteResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NoteResult> {
    eventId?: EventIdResolver<Maybe<string>, TypeParent, TContext>;

    note?: NoteResolver<Maybe<string>, TypeParent, TContext>;

    timelineId?: TimelineIdResolver<Maybe<string>, TypeParent, TContext>;

    noteId?: NoteIdResolver<string, TypeParent, TContext>;

    created?: CreatedResolver<Maybe<number>, TypeParent, TContext>;

    createdBy?: CreatedByResolver<Maybe<string>, TypeParent, TContext>;

    timelineVersion?: TimelineVersionResolver<Maybe<string>, TypeParent, TContext>;

    updated?: UpdatedResolver<Maybe<number>, TypeParent, TContext>;

    updatedBy?: UpdatedByResolver<Maybe<string>, TypeParent, TContext>;

    version?: VersionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type EventIdResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NoteResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimelineIdResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NoteIdResolver<R = string, Parent = NoteResult, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type CreatedResolver<
    R = Maybe<number>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CreatedByResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimelineVersionResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UpdatedResolver<
    R = Maybe<number>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UpdatedByResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = Maybe<string>,
    Parent = NoteResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseNotesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseNotes> {
    notes?: NotesResolver<NoteResult[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type NotesResolver<
    R = NoteResult[],
    Parent = ResponseNotes,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = Maybe<number>,
    Parent = ResponseNotes,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PinnedEventResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PinnedEvent> {
    code?: CodeResolver<Maybe<number>, TypeParent, TContext>;

    message?: MessageResolver<Maybe<string>, TypeParent, TContext>;

    pinnedEventId?: PinnedEventIdResolver<string, TypeParent, TContext>;

    eventId?: EventIdResolver<Maybe<string>, TypeParent, TContext>;

    timelineId?: TimelineIdResolver<Maybe<string>, TypeParent, TContext>;

    timelineVersion?: TimelineVersionResolver<Maybe<string>, TypeParent, TContext>;

    created?: CreatedResolver<Maybe<number>, TypeParent, TContext>;

    createdBy?: CreatedByResolver<Maybe<string>, TypeParent, TContext>;

    updated?: UpdatedResolver<Maybe<number>, TypeParent, TContext>;

    updatedBy?: UpdatedByResolver<Maybe<string>, TypeParent, TContext>;

    version?: VersionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type CodeResolver<
    R = Maybe<number>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MessageResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PinnedEventIdResolver<
    R = string,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EventIdResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimelineIdResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimelineVersionResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CreatedResolver<
    R = Maybe<number>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CreatedByResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UpdatedResolver<
    R = Maybe<number>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UpdatedByResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = Maybe<string>,
    Parent = PinnedEvent,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SourceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Source> {
    /** The id of the source */
    id?: IdResolver<string, TypeParent, TContext>;
    /** The raw configuration of the source */
    configuration?: ConfigurationResolver<SourceConfiguration, TypeParent, TContext>;
    /** The status of the source */
    status?: StatusResolver<SourceStatus, TypeParent, TContext>;

    AlertsHistogram?: AlertsHistogramResolver<AlertsOverTimeData, TypeParent, TContext>;

    AnomaliesHistogram?: AnomaliesHistogramResolver<AnomaliesOverTimeData, TypeParent, TContext>;
    /** Gets Authentication success and failures based on a timerange */
    Authentications?: AuthenticationsResolver<AuthenticationsData, TypeParent, TContext>;

    AuthenticationsHistogram?: AuthenticationsHistogramResolver<
      AuthenticationsOverTimeData,
      TypeParent,
      TContext
    >;

    Timeline?: TimelineResolver<TimelineData, TypeParent, TContext>;

    TimelineDetails?: TimelineDetailsResolver<TimelineDetailsData, TypeParent, TContext>;

    LastEventTime?: LastEventTimeResolver<LastEventTimeData, TypeParent, TContext>;

    EventsHistogram?: EventsHistogramResolver<EventsOverTimeData, TypeParent, TContext>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Hosts?: HostsResolver<HostsData, TypeParent, TContext>;

    HostOverview?: HostOverviewResolver<HostItem, TypeParent, TContext>;

    HostFirstLastSeen?: HostFirstLastSeenResolver<FirstLastSeenHost, TypeParent, TContext>;

    IpOverview?: IpOverviewResolver<Maybe<IpOverviewData>, TypeParent, TContext>;

    Users?: UsersResolver<UsersData, TypeParent, TContext>;

    KpiNetwork?: KpiNetworkResolver<Maybe<KpiNetworkData>, TypeParent, TContext>;

    KpiHosts?: KpiHostsResolver<KpiHostsData, TypeParent, TContext>;

    KpiHostDetails?: KpiHostDetailsResolver<KpiHostDetailsData, TypeParent, TContext>;

    NetworkTopCountries?: NetworkTopCountriesResolver<
      NetworkTopCountriesData,
      TypeParent,
      TContext
    >;

    NetworkTopNFlow?: NetworkTopNFlowResolver<NetworkTopNFlowData, TypeParent, TContext>;

    NetworkDns?: NetworkDnsResolver<NetworkDnsData, TypeParent, TContext>;

    NetworkHttp?: NetworkHttpResolver<NetworkHttpData, TypeParent, TContext>;

    OverviewNetwork?: OverviewNetworkResolver<Maybe<OverviewNetworkData>, TypeParent, TContext>;

    OverviewHost?: OverviewHostResolver<Maybe<OverviewHostData>, TypeParent, TContext>;

    Tls?: TlsResolver<TlsData, TypeParent, TContext>;
    /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
    UncommonProcesses?: UncommonProcessesResolver<UncommonProcessesData, TypeParent, TContext>;
    /** Just a simple example to get the app name */
    whoAmI?: WhoAmIResolver<Maybe<SayMyName>, TypeParent, TContext>;
  }

  export type IdResolver<R = string, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ConfigurationResolver<
    R = SourceConfiguration,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type StatusResolver<R = SourceStatus, Parent = Source, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type AlertsHistogramResolver<
    R = AlertsOverTimeData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, AlertsHistogramArgs>;
  export interface AlertsHistogramArgs {
    filterQuery?: Maybe<string>;

    defaultIndex: string[];

    timerange: TimerangeInput;
  }

  export type AnomaliesHistogramResolver<
    R = AnomaliesOverTimeData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, AnomaliesHistogramArgs>;
  export interface AnomaliesHistogramArgs {
    timerange: TimerangeInput;

    filterQuery?: Maybe<string>;

    defaultIndex: string[];
  }

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

  export type AuthenticationsHistogramResolver<
    R = AuthenticationsOverTimeData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, AuthenticationsHistogramArgs>;
  export interface AuthenticationsHistogramArgs {
    timerange: TimerangeInput;

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

  export type EventsHistogramResolver<
    R = EventsOverTimeData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, EventsHistogramArgs>;
  export interface EventsHistogramArgs {
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

  export type NetworkTopCountriesResolver<
    R = NetworkTopCountriesData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, NetworkTopCountriesArgs>;
  export interface NetworkTopCountriesArgs {
    id?: Maybe<string>;

    filterQuery?: Maybe<string>;

    ip?: Maybe<string>;

    flowTarget: FlowTargetSourceDest;

    pagination: PaginationInputPaginated;

    sort: NetworkTopTablesSortField;

    timerange: TimerangeInput;

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

    ip?: Maybe<string>;

    flowTarget: FlowTargetSourceDest;

    pagination: PaginationInputPaginated;

    sort: NetworkTopTablesSortField;

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

  export type NetworkHttpResolver<
    R = NetworkHttpData,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, NetworkHttpArgs>;
  export interface NetworkHttpArgs {
    id?: Maybe<string>;

    filterQuery?: Maybe<string>;

    ip?: Maybe<string>;

    pagination: PaginationInputPaginated;

    sort: NetworkHttpSortField;

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

    flowTarget: FlowTargetSourceDest;

    timerange: TimerangeInput;

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

  export type WhoAmIResolver<
    R = Maybe<SayMyName>,
    Parent = Source,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceConfiguration> {
    /** The field mapping to use for this source */
    fields?: FieldsResolver<SourceFields, TypeParent, TContext>;
  }

  export type FieldsResolver<
    R = SourceFields,
    Parent = SourceConfiguration,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceFields> {
    /** The field to identify a container by */
    container?: ContainerResolver<string, TypeParent, TContext>;
    /** The fields to identify a host by */
    host?: HostResolver<string, TypeParent, TContext>;
    /** The fields that may contain the log event message. The first field found win. */
    message?: MessageResolver<string[], TypeParent, TContext>;
    /** The field to identify a pod by */
    pod?: PodResolver<string, TypeParent, TContext>;
    /** The field to use as a tiebreaker for log events that have identical timestamps */
    tiebreaker?: TiebreakerResolver<string, TypeParent, TContext>;
    /** The field to use as a timestamp for metrics and logs */
    timestamp?: TimestampResolver<string, TypeParent, TContext>;
  }

  export type ContainerResolver<
    R = string,
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HostResolver<R = string, Parent = SourceFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type MessageResolver<
    R = string[],
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PodResolver<R = string, Parent = SourceFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TiebreakerResolver<
    R = string,
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimestampResolver<
    R = string,
    Parent = SourceFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}
/** The status of an infrastructure data source */
export namespace SourceStatusResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceStatus> {
    /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
    indicesExist?: IndicesExistResolver<boolean, TypeParent, TContext>;
    /** The list of fields defined in the index mappings */
    indexFields?: IndexFieldsResolver<IndexField[], TypeParent, TContext>;
  }

  export type IndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, IndicesExistArgs>;
  export interface IndicesExistArgs {
    defaultIndex: string[];
  }

  export type IndexFieldsResolver<
    R = IndexField[],
    Parent = SourceStatus,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    defaultIndex: string[];
  }
}
/** A descriptor of a field in an index */
export namespace IndexFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = IndexField> {
    /** Where the field belong */
    category?: CategoryResolver<string, TypeParent, TContext>;
    /** Example of field's value */
    example?: ExampleResolver<Maybe<string>, TypeParent, TContext>;
    /** whether the field's belong to an alias index */
    indexes?: IndexesResolver<(Maybe<string>)[], TypeParent, TContext>;
    /** The name of the field */
    name?: NameResolver<string, TypeParent, TContext>;
    /** The type of the field's values as recognized by Kibana */
    type?: TypeResolver<string, TypeParent, TContext>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: SearchableResolver<boolean, TypeParent, TContext>;
    /** Whether the field's values can be aggregated */
    aggregatable?: AggregatableResolver<boolean, TypeParent, TContext>;
    /** Description of the field */
    description?: DescriptionResolver<Maybe<string>, TypeParent, TContext>;

    format?: FormatResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type CategoryResolver<R = string, Parent = IndexField, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ExampleResolver<
    R = Maybe<string>,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IndexesResolver<
    R = (Maybe<string>)[],
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<R = string, Parent = IndexField, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TypeResolver<R = string, Parent = IndexField, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type SearchableResolver<
    R = boolean,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AggregatableResolver<
    R = boolean,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DescriptionResolver<
    R = Maybe<string>,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FormatResolver<
    R = Maybe<string>,
    Parent = IndexField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AlertsOverTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AlertsOverTimeData> {
    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    AlertsOverTimeByModule?: AlertsOverTimeByModuleResolver<
      MatrixOverTimeHistogramData[],
      TypeParent,
      TContext
    >;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;
  }

  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = AlertsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AlertsOverTimeByModuleResolver<
    R = MatrixOverTimeHistogramData[],
    Parent = AlertsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = AlertsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace InspectResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Inspect> {
    dsl?: DslResolver<string[], TypeParent, TContext>;

    response?: ResponseResolver<string[], TypeParent, TContext>;
  }

  export type DslResolver<R = string[], Parent = Inspect, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ResponseResolver<R = string[], Parent = Inspect, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace MatrixOverTimeHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = MatrixOverTimeHistogramData> {
    x?: XResolver<number, TypeParent, TContext>;

    y?: YResolver<number, TypeParent, TContext>;

    g?: GResolver<string, TypeParent, TContext>;
  }

  export type XResolver<
    R = number,
    Parent = MatrixOverTimeHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type YResolver<
    R = number,
    Parent = MatrixOverTimeHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GResolver<
    R = string,
    Parent = MatrixOverTimeHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AnomaliesOverTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AnomaliesOverTimeData> {
    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    AnomaliesOverTimeByModule?: AnomaliesOverTimeByModuleResolver<
      MatrixOverTimeHistogramData[],
      TypeParent,
      TContext
    >;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;
  }

  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = AnomaliesOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AnomaliesOverTimeByModuleResolver<
    R = MatrixOverTimeHistogramData[],
    Parent = AnomaliesOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = AnomaliesOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationsData> {
    edges?: EdgesResolver<AuthenticationsEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = AuthenticationsEdges[],
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = AuthenticationsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationsEdges> {
    node?: NodeResolver<AuthenticationItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = AuthenticationItem,
    Parent = AuthenticationsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = AuthenticationsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationItem> {
    _id?: _IdResolver<string, TypeParent, TContext>;

    failures?: FailuresResolver<number, TypeParent, TContext>;

    successes?: SuccessesResolver<number, TypeParent, TContext>;

    user?: UserResolver<UserEcsFields, TypeParent, TContext>;

    lastSuccess?: LastSuccessResolver<Maybe<LastSourceHost>, TypeParent, TContext>;

    lastFailure?: LastFailureResolver<Maybe<LastSourceHost>, TypeParent, TContext>;
  }

  export type _IdResolver<
    R = string,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FailuresResolver<
    R = number,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SuccessesResolver<
    R = number,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UserResolver<
    R = UserEcsFields,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LastSuccessResolver<
    R = Maybe<LastSourceHost>,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LastFailureResolver<
    R = Maybe<LastSourceHost>,
    Parent = AuthenticationItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UserEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UserEcsFields> {
    domain?: DomainResolver<Maybe<string[] | string>, TypeParent, TContext>;

    id?: IdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    full_name?: FullNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    email?: EmailResolver<Maybe<string[] | string>, TypeParent, TContext>;

    hash?: HashResolver<Maybe<string[] | string>, TypeParent, TContext>;

    group?: GroupResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type DomainResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FullNameResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EmailResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HashResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GroupResolver<
    R = Maybe<string[] | string>,
    Parent = UserEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace LastSourceHostResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = LastSourceHost> {
    timestamp?: TimestampResolver<Maybe<string>, TypeParent, TContext>;

    source?: SourceResolver<Maybe<SourceEcsFields>, TypeParent, TContext>;

    host?: HostResolver<Maybe<HostEcsFields>, TypeParent, TContext>;
  }

  export type TimestampResolver<
    R = Maybe<string>,
    Parent = LastSourceHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceResolver<
    R = Maybe<SourceEcsFields>,
    Parent = LastSourceHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HostResolver<
    R = Maybe<HostEcsFields>,
    Parent = LastSourceHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SourceEcsFields> {
    bytes?: BytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    ip?: IpResolver<Maybe<string[] | string>, TypeParent, TContext>;

    port?: PortResolver<Maybe<number[] | number>, TypeParent, TContext>;

    domain?: DomainResolver<Maybe<string[] | string>, TypeParent, TContext>;

    geo?: GeoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    packets?: PacketsResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type BytesResolver<
    R = Maybe<number[] | number>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IpResolver<
    R = Maybe<string[] | string>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PortResolver<
    R = Maybe<number[] | number>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DomainResolver<
    R = Maybe<string[] | string>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GeoResolver<
    R = Maybe<GeoEcsFields>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PacketsResolver<
    R = Maybe<number[] | number>,
    Parent = SourceEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace GeoEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = GeoEcsFields> {
    city_name?: CityNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    continent_name?: ContinentNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    country_iso_code?: CountryIsoCodeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    country_name?: CountryNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    location?: LocationResolver<Maybe<Location>, TypeParent, TContext>;

    region_iso_code?: RegionIsoCodeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    region_name?: RegionNameResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type CityNameResolver<
    R = Maybe<string[] | string>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ContinentNameResolver<
    R = Maybe<string[] | string>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CountryIsoCodeResolver<
    R = Maybe<string[] | string>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CountryNameResolver<
    R = Maybe<string[] | string>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocationResolver<
    R = Maybe<Location>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RegionIsoCodeResolver<
    R = Maybe<string[] | string>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RegionNameResolver<
    R = Maybe<string[] | string>,
    Parent = GeoEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace LocationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Location> {
    lon?: LonResolver<Maybe<number[] | number>, TypeParent, TContext>;

    lat?: LatResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type LonResolver<
    R = Maybe<number[] | number>,
    Parent = Location,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LatResolver<
    R = Maybe<number[] | number>,
    Parent = Location,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostEcsFields> {
    architecture?: ArchitectureResolver<Maybe<string[] | string>, TypeParent, TContext>;

    id?: IdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    ip?: IpResolver<Maybe<string[] | string>, TypeParent, TContext>;

    mac?: MacResolver<Maybe<string[] | string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    os?: OsResolver<Maybe<OsEcsFields>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type ArchitectureResolver<
    R = Maybe<string[] | string>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<
    R = Maybe<string[] | string>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IpResolver<
    R = Maybe<string[] | string>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MacResolver<
    R = Maybe<string[] | string>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OsResolver<
    R = Maybe<OsEcsFields>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string[] | string>,
    Parent = HostEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OsEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OsEcsFields> {
    platform?: PlatformResolver<Maybe<string[] | string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    full?: FullResolver<Maybe<string[] | string>, TypeParent, TContext>;

    family?: FamilyResolver<Maybe<string[] | string>, TypeParent, TContext>;

    version?: VersionResolver<Maybe<string[] | string>, TypeParent, TContext>;

    kernel?: KernelResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type PlatformResolver<
    R = Maybe<string[] | string>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FullResolver<
    R = Maybe<string[] | string>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FamilyResolver<
    R = Maybe<string[] | string>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = Maybe<string[] | string>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KernelResolver<
    R = Maybe<string[] | string>,
    Parent = OsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CursorTypeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CursorType> {
    value?: ValueResolver<Maybe<string>, TypeParent, TContext>;

    tiebreaker?: TiebreakerResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type ValueResolver<
    R = Maybe<string>,
    Parent = CursorType,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TiebreakerResolver<
    R = Maybe<string>,
    Parent = CursorType,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PageInfoPaginatedResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PageInfoPaginated> {
    activePage?: ActivePageResolver<number, TypeParent, TContext>;

    fakeTotalCount?: FakeTotalCountResolver<number, TypeParent, TContext>;

    showMorePagesIndicator?: ShowMorePagesIndicatorResolver<boolean, TypeParent, TContext>;
  }

  export type ActivePageResolver<
    R = number,
    Parent = PageInfoPaginated,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FakeTotalCountResolver<
    R = number,
    Parent = PageInfoPaginated,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ShowMorePagesIndicatorResolver<
    R = boolean,
    Parent = PageInfoPaginated,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthenticationsOverTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthenticationsOverTimeData> {
    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    AuthenticationsOverTimeByModule?: AuthenticationsOverTimeByModuleResolver<
      MatrixOverTimeHistogramData[],
      TypeParent,
      TContext
    >;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;
  }

  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = AuthenticationsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthenticationsOverTimeByModuleResolver<
    R = MatrixOverTimeHistogramData[],
    Parent = AuthenticationsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = AuthenticationsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineData> {
    edges?: EdgesResolver<TimelineEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = TimelineEdges[],
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = TimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineEdges> {
    node?: NodeResolver<TimelineItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = TimelineItem,
    Parent = TimelineEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = TimelineEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineItem> {
    _id?: _IdResolver<string, TypeParent, TContext>;

    _index?: _IndexResolver<Maybe<string>, TypeParent, TContext>;

    data?: DataResolver<TimelineNonEcsData[], TypeParent, TContext>;

    ecs?: EcsResolver<Ecs, TypeParent, TContext>;
  }

  export type _IdResolver<R = string, Parent = TimelineItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type _IndexResolver<
    R = Maybe<string>,
    Parent = TimelineItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DataResolver<
    R = TimelineNonEcsData[],
    Parent = TimelineItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EcsResolver<R = Ecs, Parent = TimelineItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TimelineNonEcsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineNonEcsData> {
    field?: FieldResolver<string, TypeParent, TContext>;

    value?: ValueResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type FieldResolver<
    R = string,
    Parent = TimelineNonEcsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ValueResolver<
    R = Maybe<string[] | string>,
    Parent = TimelineNonEcsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EcsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Ecs> {
    _id?: _IdResolver<string, TypeParent, TContext>;

    _index?: _IndexResolver<Maybe<string>, TypeParent, TContext>;

    auditd?: AuditdResolver<Maybe<AuditdEcsFields>, TypeParent, TContext>;

    destination?: DestinationResolver<Maybe<DestinationEcsFields>, TypeParent, TContext>;

    dns?: DnsResolver<Maybe<DnsEcsFields>, TypeParent, TContext>;

    endgame?: EndgameResolver<Maybe<EndgameEcsFields>, TypeParent, TContext>;

    event?: EventResolver<Maybe<EventEcsFields>, TypeParent, TContext>;

    geo?: GeoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    host?: HostResolver<Maybe<HostEcsFields>, TypeParent, TContext>;

    network?: NetworkResolver<Maybe<NetworkEcsField>, TypeParent, TContext>;

    source?: SourceResolver<Maybe<SourceEcsFields>, TypeParent, TContext>;

    suricata?: SuricataResolver<Maybe<SuricataEcsFields>, TypeParent, TContext>;

    tls?: TlsResolver<Maybe<TlsEcsFields>, TypeParent, TContext>;

    zeek?: ZeekResolver<Maybe<ZeekEcsFields>, TypeParent, TContext>;

    http?: HttpResolver<Maybe<HttpEcsFields>, TypeParent, TContext>;

    url?: UrlResolver<Maybe<UrlEcsFields>, TypeParent, TContext>;

    timestamp?: TimestampResolver<Maybe<string>, TypeParent, TContext>;

    message?: MessageResolver<Maybe<string[] | string>, TypeParent, TContext>;

    user?: UserResolver<Maybe<UserEcsFields>, TypeParent, TContext>;

    winlog?: WinlogResolver<Maybe<WinlogEcsFields>, TypeParent, TContext>;

    process?: ProcessResolver<Maybe<ProcessEcsFields>, TypeParent, TContext>;

    file?: FileResolver<Maybe<FileFields>, TypeParent, TContext>;

    system?: SystemResolver<Maybe<SystemEcsField>, TypeParent, TContext>;
  }

  export type _IdResolver<R = string, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type _IndexResolver<R = Maybe<string>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type AuditdResolver<
    R = Maybe<AuditdEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationResolver<
    R = Maybe<DestinationEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DnsResolver<R = Maybe<DnsEcsFields>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type EndgameResolver<
    R = Maybe<EndgameEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EventResolver<
    R = Maybe<EventEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GeoResolver<R = Maybe<GeoEcsFields>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type HostResolver<
    R = Maybe<HostEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NetworkResolver<
    R = Maybe<NetworkEcsField>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceResolver<
    R = Maybe<SourceEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SuricataResolver<
    R = Maybe<SuricataEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TlsResolver<R = Maybe<TlsEcsFields>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ZeekResolver<
    R = Maybe<ZeekEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HttpResolver<
    R = Maybe<HttpEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UrlResolver<R = Maybe<UrlEcsFields>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TimestampResolver<R = Maybe<string>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type MessageResolver<
    R = Maybe<string[] | string>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UserResolver<
    R = Maybe<UserEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type WinlogResolver<
    R = Maybe<WinlogEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ProcessResolver<
    R = Maybe<ProcessEcsFields>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FileResolver<R = Maybe<FileFields>, Parent = Ecs, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type SystemResolver<
    R = Maybe<SystemEcsField>,
    Parent = Ecs,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuditdEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuditdEcsFields> {
    result?: ResultResolver<Maybe<string[] | string>, TypeParent, TContext>;

    session?: SessionResolver<Maybe<string[] | string>, TypeParent, TContext>;

    data?: DataResolver<Maybe<AuditdData>, TypeParent, TContext>;

    summary?: SummaryResolver<Maybe<Summary>, TypeParent, TContext>;

    sequence?: SequenceResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type ResultResolver<
    R = Maybe<string[] | string>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SessionResolver<
    R = Maybe<string[] | string>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DataResolver<
    R = Maybe<AuditdData>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SummaryResolver<
    R = Maybe<Summary>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SequenceResolver<
    R = Maybe<string[] | string>,
    Parent = AuditdEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuditdDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuditdData> {
    acct?: AcctResolver<Maybe<string[] | string>, TypeParent, TContext>;

    terminal?: TerminalResolver<Maybe<string[] | string>, TypeParent, TContext>;

    op?: OpResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type AcctResolver<
    R = Maybe<string[] | string>,
    Parent = AuditdData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TerminalResolver<
    R = Maybe<string[] | string>,
    Parent = AuditdData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OpResolver<
    R = Maybe<string[] | string>,
    Parent = AuditdData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SummaryResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Summary> {
    actor?: ActorResolver<Maybe<PrimarySecondary>, TypeParent, TContext>;

    object?: ObjectResolver<Maybe<PrimarySecondary>, TypeParent, TContext>;

    how?: HowResolver<Maybe<string[] | string>, TypeParent, TContext>;

    message_type?: MessageTypeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    sequence?: SequenceResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type ActorResolver<
    R = Maybe<PrimarySecondary>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ObjectResolver<
    R = Maybe<PrimarySecondary>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HowResolver<
    R = Maybe<string[] | string>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MessageTypeResolver<
    R = Maybe<string[] | string>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SequenceResolver<
    R = Maybe<string[] | string>,
    Parent = Summary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PrimarySecondaryResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PrimarySecondary> {
    primary?: PrimaryResolver<Maybe<string[] | string>, TypeParent, TContext>;

    secondary?: SecondaryResolver<Maybe<string[] | string>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type PrimaryResolver<
    R = Maybe<string[] | string>,
    Parent = PrimarySecondary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SecondaryResolver<
    R = Maybe<string[] | string>,
    Parent = PrimarySecondary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string[] | string>,
    Parent = PrimarySecondary,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DestinationEcsFields> {
    bytes?: BytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    ip?: IpResolver<Maybe<string[] | string>, TypeParent, TContext>;

    port?: PortResolver<Maybe<number[] | number>, TypeParent, TContext>;

    domain?: DomainResolver<Maybe<string[] | string>, TypeParent, TContext>;

    geo?: GeoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    packets?: PacketsResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type BytesResolver<
    R = Maybe<number[] | number>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IpResolver<
    R = Maybe<string[] | string>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PortResolver<
    R = Maybe<number[] | number>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DomainResolver<
    R = Maybe<string[] | string>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GeoResolver<
    R = Maybe<GeoEcsFields>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PacketsResolver<
    R = Maybe<number[] | number>,
    Parent = DestinationEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DnsEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DnsEcsFields> {
    question?: QuestionResolver<Maybe<DnsQuestionData>, TypeParent, TContext>;

    resolved_ip?: ResolvedIpResolver<Maybe<string[] | string>, TypeParent, TContext>;

    response_code?: ResponseCodeResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type QuestionResolver<
    R = Maybe<DnsQuestionData>,
    Parent = DnsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ResolvedIpResolver<
    R = Maybe<string[] | string>,
    Parent = DnsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ResponseCodeResolver<
    R = Maybe<string[] | string>,
    Parent = DnsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DnsQuestionDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DnsQuestionData> {
    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = DnsQuestionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string[] | string>,
    Parent = DnsQuestionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EndgameEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EndgameEcsFields> {
    exit_code?: ExitCodeResolver<Maybe<number[] | number>, TypeParent, TContext>;

    file_name?: FileNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    file_path?: FilePathResolver<Maybe<string[] | string>, TypeParent, TContext>;

    logon_type?: LogonTypeResolver<Maybe<number[] | number>, TypeParent, TContext>;

    parent_process_name?: ParentProcessNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    pid?: PidResolver<Maybe<number[] | number>, TypeParent, TContext>;

    process_name?: ProcessNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    subject_domain_name?: SubjectDomainNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    subject_logon_id?: SubjectLogonIdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    subject_user_name?: SubjectUserNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    target_domain_name?: TargetDomainNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    target_logon_id?: TargetLogonIdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    target_user_name?: TargetUserNameResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type ExitCodeResolver<
    R = Maybe<number[] | number>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FileNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilePathResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LogonTypeResolver<
    R = Maybe<number[] | number>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ParentProcessNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PidResolver<
    R = Maybe<number[] | number>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ProcessNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SubjectDomainNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SubjectLogonIdResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SubjectUserNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TargetDomainNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TargetLogonIdResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TargetUserNameResolver<
    R = Maybe<string[] | string>,
    Parent = EndgameEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EventEcsFields> {
    action?: ActionResolver<Maybe<string[] | string>, TypeParent, TContext>;

    category?: CategoryResolver<Maybe<string[] | string>, TypeParent, TContext>;

    code?: CodeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    created?: CreatedResolver<Maybe<string[] | string>, TypeParent, TContext>;

    dataset?: DatasetResolver<Maybe<string[] | string>, TypeParent, TContext>;

    duration?: DurationResolver<Maybe<number[] | number>, TypeParent, TContext>;

    end?: EndResolver<Maybe<string[] | string>, TypeParent, TContext>;

    hash?: HashResolver<Maybe<string[] | string>, TypeParent, TContext>;

    id?: IdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    kind?: KindResolver<Maybe<string[] | string>, TypeParent, TContext>;

    module?: ModuleResolver<Maybe<string[] | string>, TypeParent, TContext>;

    original?: OriginalResolver<Maybe<string[] | string>, TypeParent, TContext>;

    outcome?: OutcomeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    risk_score?: RiskScoreResolver<Maybe<number[] | number>, TypeParent, TContext>;

    risk_score_norm?: RiskScoreNormResolver<Maybe<number[] | number>, TypeParent, TContext>;

    severity?: SeverityResolver<Maybe<number[] | number>, TypeParent, TContext>;

    start?: StartResolver<Maybe<string[] | string>, TypeParent, TContext>;

    timezone?: TimezoneResolver<Maybe<string[] | string>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type ActionResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CategoryResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CodeResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CreatedResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DatasetResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DurationResolver<
    R = Maybe<number[] | number>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HashResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KindResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ModuleResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OriginalResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OutcomeResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RiskScoreResolver<
    R = Maybe<number[] | number>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RiskScoreNormResolver<
    R = Maybe<number[] | number>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SeverityResolver<
    R = Maybe<number[] | number>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type StartResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimezoneResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string[] | string>,
    Parent = EventEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkEcsFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkEcsField> {
    bytes?: BytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    community_id?: CommunityIdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    direction?: DirectionResolver<Maybe<string[] | string>, TypeParent, TContext>;

    packets?: PacketsResolver<Maybe<number[] | number>, TypeParent, TContext>;

    protocol?: ProtocolResolver<Maybe<string[] | string>, TypeParent, TContext>;

    transport?: TransportResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type BytesResolver<
    R = Maybe<number[] | number>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CommunityIdResolver<
    R = Maybe<string[] | string>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DirectionResolver<
    R = Maybe<string[] | string>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PacketsResolver<
    R = Maybe<number[] | number>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ProtocolResolver<
    R = Maybe<string[] | string>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TransportResolver<
    R = Maybe<string[] | string>,
    Parent = NetworkEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SuricataEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SuricataEcsFields> {
    eve?: EveResolver<Maybe<SuricataEveData>, TypeParent, TContext>;
  }

  export type EveResolver<
    R = Maybe<SuricataEveData>,
    Parent = SuricataEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SuricataEveDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SuricataEveData> {
    alert?: AlertResolver<Maybe<SuricataAlertData>, TypeParent, TContext>;

    flow_id?: FlowIdResolver<Maybe<number[] | number>, TypeParent, TContext>;

    proto?: ProtoResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type AlertResolver<
    R = Maybe<SuricataAlertData>,
    Parent = SuricataEveData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FlowIdResolver<
    R = Maybe<number[] | number>,
    Parent = SuricataEveData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ProtoResolver<
    R = Maybe<string[] | string>,
    Parent = SuricataEveData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SuricataAlertDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SuricataAlertData> {
    signature?: SignatureResolver<Maybe<string[] | string>, TypeParent, TContext>;

    signature_id?: SignatureIdResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type SignatureResolver<
    R = Maybe<string[] | string>,
    Parent = SuricataAlertData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SignatureIdResolver<
    R = Maybe<number[] | number>,
    Parent = SuricataAlertData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsEcsFields> {
    client_certificate?: ClientCertificateResolver<
      Maybe<TlsClientCertificateData>,
      TypeParent,
      TContext
    >;

    fingerprints?: FingerprintsResolver<Maybe<TlsFingerprintsData>, TypeParent, TContext>;

    server_certificate?: ServerCertificateResolver<
      Maybe<TlsServerCertificateData>,
      TypeParent,
      TContext
    >;
  }

  export type ClientCertificateResolver<
    R = Maybe<TlsClientCertificateData>,
    Parent = TlsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FingerprintsResolver<
    R = Maybe<TlsFingerprintsData>,
    Parent = TlsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ServerCertificateResolver<
    R = Maybe<TlsServerCertificateData>,
    Parent = TlsEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsClientCertificateDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsClientCertificateData> {
    fingerprint?: FingerprintResolver<Maybe<FingerprintData>, TypeParent, TContext>;
  }

  export type FingerprintResolver<
    R = Maybe<FingerprintData>,
    Parent = TlsClientCertificateData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FingerprintDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FingerprintData> {
    sha1?: Sha1Resolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type Sha1Resolver<
    R = Maybe<string[] | string>,
    Parent = FingerprintData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsFingerprintsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsFingerprintsData> {
    ja3?: Ja3Resolver<Maybe<TlsJa3Data>, TypeParent, TContext>;
  }

  export type Ja3Resolver<
    R = Maybe<TlsJa3Data>,
    Parent = TlsFingerprintsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsJa3DataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsJa3Data> {
    hash?: HashResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type HashResolver<
    R = Maybe<string[] | string>,
    Parent = TlsJa3Data,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsServerCertificateDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsServerCertificateData> {
    fingerprint?: FingerprintResolver<Maybe<FingerprintData>, TypeParent, TContext>;
  }

  export type FingerprintResolver<
    R = Maybe<FingerprintData>,
    Parent = TlsServerCertificateData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekEcsFields> {
    session_id?: SessionIdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    connection?: ConnectionResolver<Maybe<ZeekConnectionData>, TypeParent, TContext>;

    notice?: NoticeResolver<Maybe<ZeekNoticeData>, TypeParent, TContext>;

    dns?: DnsResolver<Maybe<ZeekDnsData>, TypeParent, TContext>;

    http?: HttpResolver<Maybe<ZeekHttpData>, TypeParent, TContext>;

    files?: FilesResolver<Maybe<ZeekFileData>, TypeParent, TContext>;

    ssl?: SslResolver<Maybe<ZeekSslData>, TypeParent, TContext>;
  }

  export type SessionIdResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ConnectionResolver<
    R = Maybe<ZeekConnectionData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NoticeResolver<
    R = Maybe<ZeekNoticeData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DnsResolver<
    R = Maybe<ZeekDnsData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HttpResolver<
    R = Maybe<ZeekHttpData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilesResolver<
    R = Maybe<ZeekFileData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SslResolver<
    R = Maybe<ZeekSslData>,
    Parent = ZeekEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekConnectionDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekConnectionData> {
    local_resp?: LocalRespResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    local_orig?: LocalOrigResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    missed_bytes?: MissedBytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    state?: StateResolver<Maybe<string[] | string>, TypeParent, TContext>;

    history?: HistoryResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type LocalRespResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocalOrigResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MissedBytesResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type StateResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HistoryResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekConnectionData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekNoticeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekNoticeData> {
    suppress_for?: SuppressForResolver<Maybe<number[] | number>, TypeParent, TContext>;

    msg?: MsgResolver<Maybe<string[] | string>, TypeParent, TContext>;

    note?: NoteResolver<Maybe<string[] | string>, TypeParent, TContext>;

    sub?: SubResolver<Maybe<string[] | string>, TypeParent, TContext>;

    dst?: DstResolver<Maybe<string[] | string>, TypeParent, TContext>;

    dropped?: DroppedResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    peer_descr?: PeerDescrResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type SuppressForResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MsgResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NoteResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SubResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DstResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DroppedResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PeerDescrResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekNoticeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekDnsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekDnsData> {
    AA?: AaResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    qclass_name?: QclassNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    RD?: RdResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    qtype_name?: QtypeNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    rejected?: RejectedResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    qtype?: QtypeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    query?: QueryResolver<Maybe<string[] | string>, TypeParent, TContext>;

    trans_id?: TransIdResolver<Maybe<number[] | number>, TypeParent, TContext>;

    qclass?: QclassResolver<Maybe<string[] | string>, TypeParent, TContext>;

    RA?: RaResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    TC?: TcResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;
  }

  export type AaResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QclassNameResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RdResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QtypeNameResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RejectedResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QtypeResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QueryResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TransIdResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QclassResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RaResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TcResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekHttpDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekHttpData> {
    resp_mime_types?: RespMimeTypesResolver<Maybe<string[] | string>, TypeParent, TContext>;

    trans_depth?: TransDepthResolver<Maybe<string[] | string>, TypeParent, TContext>;

    status_msg?: StatusMsgResolver<Maybe<string[] | string>, TypeParent, TContext>;

    resp_fuids?: RespFuidsResolver<Maybe<string[] | string>, TypeParent, TContext>;

    tags?: TagsResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type RespMimeTypesResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TransDepthResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type StatusMsgResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RespFuidsResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TagsResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekFileDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekFileData> {
    session_ids?: SessionIdsResolver<Maybe<string[] | string>, TypeParent, TContext>;

    timedout?: TimedoutResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    local_orig?: LocalOrigResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    tx_host?: TxHostResolver<Maybe<string[] | string>, TypeParent, TContext>;

    source?: SourceResolver<Maybe<string[] | string>, TypeParent, TContext>;

    is_orig?: IsOrigResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    overflow_bytes?: OverflowBytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    sha1?: Sha1Resolver<Maybe<string[] | string>, TypeParent, TContext>;

    duration?: DurationResolver<Maybe<number[] | number>, TypeParent, TContext>;

    depth?: DepthResolver<Maybe<number[] | number>, TypeParent, TContext>;

    analyzers?: AnalyzersResolver<Maybe<string[] | string>, TypeParent, TContext>;

    mime_type?: MimeTypeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    rx_host?: RxHostResolver<Maybe<string[] | string>, TypeParent, TContext>;

    total_bytes?: TotalBytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    fuid?: FuidResolver<Maybe<string[] | string>, TypeParent, TContext>;

    seen_bytes?: SeenBytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    missing_bytes?: MissingBytesResolver<Maybe<number[] | number>, TypeParent, TContext>;

    md5?: Md5Resolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type SessionIdsResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimedoutResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocalOrigResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TxHostResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IsOrigResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OverflowBytesResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type Sha1Resolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DurationResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DepthResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AnalyzersResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MimeTypeResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RxHostResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalBytesResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FuidResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SeenBytesResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MissingBytesResolver<
    R = Maybe<number[] | number>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type Md5Resolver<
    R = Maybe<string[] | string>,
    Parent = ZeekFileData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ZeekSslDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ZeekSslData> {
    cipher?: CipherResolver<Maybe<string[] | string>, TypeParent, TContext>;

    established?: EstablishedResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    resumed?: ResumedResolver<Maybe<boolean[] | boolean>, TypeParent, TContext>;

    version?: VersionResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type CipherResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EstablishedResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ResumedResolver<
    R = Maybe<boolean[] | boolean>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = Maybe<string[] | string>,
    Parent = ZeekSslData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpEcsFields> {
    version?: VersionResolver<Maybe<string[] | string>, TypeParent, TContext>;

    request?: RequestResolver<Maybe<HttpRequestData>, TypeParent, TContext>;

    response?: ResponseResolver<Maybe<HttpResponseData>, TypeParent, TContext>;
  }

  export type VersionResolver<
    R = Maybe<string[] | string>,
    Parent = HttpEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RequestResolver<
    R = Maybe<HttpRequestData>,
    Parent = HttpEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ResponseResolver<
    R = Maybe<HttpResponseData>,
    Parent = HttpEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpRequestDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpRequestData> {
    method?: MethodResolver<Maybe<string[] | string>, TypeParent, TContext>;

    body?: BodyResolver<Maybe<HttpBodyData>, TypeParent, TContext>;

    referrer?: ReferrerResolver<Maybe<string[] | string>, TypeParent, TContext>;

    bytes?: BytesResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type MethodResolver<
    R = Maybe<string[] | string>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type BodyResolver<
    R = Maybe<HttpBodyData>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ReferrerResolver<
    R = Maybe<string[] | string>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type BytesResolver<
    R = Maybe<number[] | number>,
    Parent = HttpRequestData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpBodyDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpBodyData> {
    content?: ContentResolver<Maybe<string[] | string>, TypeParent, TContext>;

    bytes?: BytesResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type ContentResolver<
    R = Maybe<string[] | string>,
    Parent = HttpBodyData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type BytesResolver<
    R = Maybe<number[] | number>,
    Parent = HttpBodyData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HttpResponseDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HttpResponseData> {
    status_code?: StatusCodeResolver<Maybe<number[] | number>, TypeParent, TContext>;

    body?: BodyResolver<Maybe<HttpBodyData>, TypeParent, TContext>;

    bytes?: BytesResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type StatusCodeResolver<
    R = Maybe<number[] | number>,
    Parent = HttpResponseData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type BodyResolver<
    R = Maybe<HttpBodyData>,
    Parent = HttpResponseData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type BytesResolver<
    R = Maybe<number[] | number>,
    Parent = HttpResponseData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UrlEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UrlEcsFields> {
    domain?: DomainResolver<Maybe<string[] | string>, TypeParent, TContext>;

    original?: OriginalResolver<Maybe<string[] | string>, TypeParent, TContext>;

    username?: UsernameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    password?: PasswordResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type DomainResolver<
    R = Maybe<string[] | string>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OriginalResolver<
    R = Maybe<string[] | string>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UsernameResolver<
    R = Maybe<string[] | string>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PasswordResolver<
    R = Maybe<string[] | string>,
    Parent = UrlEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace WinlogEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = WinlogEcsFields> {
    event_id?: EventIdResolver<Maybe<number[] | number>, TypeParent, TContext>;
  }

  export type EventIdResolver<
    R = Maybe<number[] | number>,
    Parent = WinlogEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ProcessEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ProcessEcsFields> {
    hash?: HashResolver<Maybe<ProcessHashData>, TypeParent, TContext>;

    pid?: PidResolver<Maybe<number[] | number>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    ppid?: PpidResolver<Maybe<number[] | number>, TypeParent, TContext>;

    args?: ArgsResolver<Maybe<string[] | string>, TypeParent, TContext>;

    executable?: ExecutableResolver<Maybe<string[] | string>, TypeParent, TContext>;

    title?: TitleResolver<Maybe<string[] | string>, TypeParent, TContext>;

    thread?: ThreadResolver<Maybe<Thread>, TypeParent, TContext>;

    working_directory?: WorkingDirectoryResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type HashResolver<
    R = Maybe<ProcessHashData>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PidResolver<
    R = Maybe<number[] | number>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PpidResolver<
    R = Maybe<number[] | number>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ArgsResolver<
    R = Maybe<string[] | string>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ExecutableResolver<
    R = Maybe<string[] | string>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TitleResolver<
    R = Maybe<string[] | string>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ThreadResolver<
    R = Maybe<Thread>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type WorkingDirectoryResolver<
    R = Maybe<string[] | string>,
    Parent = ProcessEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ProcessHashDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ProcessHashData> {
    md5?: Md5Resolver<Maybe<string[] | string>, TypeParent, TContext>;

    sha1?: Sha1Resolver<Maybe<string[] | string>, TypeParent, TContext>;

    sha256?: Sha256Resolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type Md5Resolver<
    R = Maybe<string[] | string>,
    Parent = ProcessHashData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type Sha1Resolver<
    R = Maybe<string[] | string>,
    Parent = ProcessHashData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type Sha256Resolver<
    R = Maybe<string[] | string>,
    Parent = ProcessHashData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ThreadResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Thread> {
    id?: IdResolver<Maybe<number[] | number>, TypeParent, TContext>;

    start?: StartResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type IdResolver<
    R = Maybe<number[] | number>,
    Parent = Thread,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type StartResolver<
    R = Maybe<string[] | string>,
    Parent = Thread,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FileFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FileFields> {
    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    path?: PathResolver<Maybe<string[] | string>, TypeParent, TContext>;

    target_path?: TargetPathResolver<Maybe<string[] | string>, TypeParent, TContext>;

    extension?: ExtensionResolver<Maybe<string[] | string>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    device?: DeviceResolver<Maybe<string[] | string>, TypeParent, TContext>;

    inode?: InodeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    uid?: UidResolver<Maybe<string[] | string>, TypeParent, TContext>;

    owner?: OwnerResolver<Maybe<string[] | string>, TypeParent, TContext>;

    gid?: GidResolver<Maybe<string[] | string>, TypeParent, TContext>;

    group?: GroupResolver<Maybe<string[] | string>, TypeParent, TContext>;

    mode?: ModeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    size?: SizeResolver<Maybe<number[] | number>, TypeParent, TContext>;

    mtime?: MtimeResolver<Maybe<string[] | string>, TypeParent, TContext>;

    ctime?: CtimeResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PathResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TargetPathResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ExtensionResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DeviceResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InodeResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UidResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OwnerResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GidResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GroupResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ModeResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SizeResolver<
    R = Maybe<number[] | number>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MtimeResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CtimeResolver<
    R = Maybe<string[] | string>,
    Parent = FileFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SystemEcsFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SystemEcsField> {
    audit?: AuditResolver<Maybe<AuditEcsFields>, TypeParent, TContext>;

    auth?: AuthResolver<Maybe<AuthEcsFields>, TypeParent, TContext>;
  }

  export type AuditResolver<
    R = Maybe<AuditEcsFields>,
    Parent = SystemEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthResolver<
    R = Maybe<AuthEcsFields>,
    Parent = SystemEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuditEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuditEcsFields> {
    package?: PackageResolver<Maybe<PackageEcsFields>, TypeParent, TContext>;
  }

  export type PackageResolver<
    R = Maybe<PackageEcsFields>,
    Parent = AuditEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PackageEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PackageEcsFields> {
    arch?: ArchResolver<Maybe<string[] | string>, TypeParent, TContext>;

    entity_id?: EntityIdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    size?: SizeResolver<Maybe<number[] | number>, TypeParent, TContext>;

    summary?: SummaryResolver<Maybe<string[] | string>, TypeParent, TContext>;

    version?: VersionResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type ArchResolver<
    R = Maybe<string[] | string>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EntityIdResolver<
    R = Maybe<string[] | string>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string[] | string>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SizeResolver<
    R = Maybe<number[] | number>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SummaryResolver<
    R = Maybe<string[] | string>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = Maybe<string[] | string>,
    Parent = PackageEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AuthEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AuthEcsFields> {
    ssh?: SshResolver<Maybe<SshEcsFields>, TypeParent, TContext>;
  }

  export type SshResolver<
    R = Maybe<SshEcsFields>,
    Parent = AuthEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SshEcsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SshEcsFields> {
    method?: MethodResolver<Maybe<string[] | string>, TypeParent, TContext>;

    signature?: SignatureResolver<Maybe<string[] | string>, TypeParent, TContext>;
  }

  export type MethodResolver<
    R = Maybe<string[] | string>,
    Parent = SshEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SignatureResolver<
    R = Maybe<string[] | string>,
    Parent = SshEcsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace PageInfoResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = PageInfo> {
    endCursor?: EndCursorResolver<Maybe<CursorType>, TypeParent, TContext>;

    hasNextPage?: HasNextPageResolver<Maybe<boolean>, TypeParent, TContext>;
  }

  export type EndCursorResolver<
    R = Maybe<CursorType>,
    Parent = PageInfo,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HasNextPageResolver<
    R = Maybe<boolean>,
    Parent = PageInfo,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TimelineDetailsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineDetailsData> {
    data?: DataResolver<Maybe<DetailItem[]>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type DataResolver<
    R = Maybe<DetailItem[]>,
    Parent = TimelineDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = TimelineDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DetailItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DetailItem> {
    field?: FieldResolver<string, TypeParent, TContext>;

    values?: ValuesResolver<Maybe<string[] | string>, TypeParent, TContext>;

    originalValue?: OriginalValueResolver<Maybe<EsValue>, TypeParent, TContext>;
  }

  export type FieldResolver<R = string, Parent = DetailItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type ValuesResolver<
    R = Maybe<string[] | string>,
    Parent = DetailItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OriginalValueResolver<
    R = Maybe<EsValue>,
    Parent = DetailItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace LastEventTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = LastEventTimeData> {
    lastSeen?: LastSeenResolver<Maybe<string>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type LastSeenResolver<
    R = Maybe<string>,
    Parent = LastEventTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = LastEventTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EventsOverTimeDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EventsOverTimeData> {
    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    EventsOverTimeByModule?: EventsOverTimeByModuleResolver<
      MatrixOverTimeHistogramData[],
      TypeParent,
      TContext
    >;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;
  }

  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = EventsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EventsOverTimeByModuleResolver<
    R = MatrixOverTimeHistogramData[],
    Parent = EventsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = EventsOverTimeData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostsData> {
    edges?: EdgesResolver<HostsEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = HostsEdges[],
    Parent = HostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<R = number, Parent = HostsData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = HostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = HostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostsEdges> {
    node?: NodeResolver<HostItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<R = HostItem, Parent = HostsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type CursorResolver<
    R = CursorType,
    Parent = HostsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostItem> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: LastSeenResolver<Maybe<string>, TypeParent, TContext>;

    host?: HostResolver<Maybe<HostEcsFields>, TypeParent, TContext>;

    cloud?: CloudResolver<Maybe<CloudFields>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type _IdResolver<R = Maybe<string>, Parent = HostItem, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type LastSeenResolver<
    R = Maybe<string>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HostResolver<
    R = Maybe<HostEcsFields>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CloudResolver<
    R = Maybe<CloudFields>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = HostItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CloudFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CloudFields> {
    instance?: InstanceResolver<Maybe<CloudInstance>, TypeParent, TContext>;

    machine?: MachineResolver<Maybe<CloudMachine>, TypeParent, TContext>;

    provider?: ProviderResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;

    region?: RegionResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;
  }

  export type InstanceResolver<
    R = Maybe<CloudInstance>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MachineResolver<
    R = Maybe<CloudMachine>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ProviderResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RegionResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CloudInstanceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CloudInstance> {
    id?: IdResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;
  }

  export type IdResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudInstance,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace CloudMachineResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = CloudMachine> {
    type?: TypeResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;
  }

  export type TypeResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = CloudMachine,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FirstLastSeenHostResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FirstLastSeenHost> {
    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    firstSeen?: FirstSeenResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: LastSeenResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = FirstLastSeenHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FirstSeenResolver<
    R = Maybe<string>,
    Parent = FirstLastSeenHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LastSeenResolver<
    R = Maybe<string>,
    Parent = FirstLastSeenHost,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace IpOverviewDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = IpOverviewData> {
    client?: ClientResolver<Maybe<Overview>, TypeParent, TContext>;

    destination?: DestinationResolver<Maybe<Overview>, TypeParent, TContext>;

    host?: HostResolver<HostEcsFields, TypeParent, TContext>;

    server?: ServerResolver<Maybe<Overview>, TypeParent, TContext>;

    source?: SourceResolver<Maybe<Overview>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type ClientResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HostResolver<
    R = HostEcsFields,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ServerResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceResolver<
    R = Maybe<Overview>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = IpOverviewData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OverviewResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = Overview> {
    firstSeen?: FirstSeenResolver<Maybe<string>, TypeParent, TContext>;

    lastSeen?: LastSeenResolver<Maybe<string>, TypeParent, TContext>;

    autonomousSystem?: AutonomousSystemResolver<AutonomousSystem, TypeParent, TContext>;

    geo?: GeoResolver<GeoEcsFields, TypeParent, TContext>;
  }

  export type FirstSeenResolver<
    R = Maybe<string>,
    Parent = Overview,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LastSeenResolver<
    R = Maybe<string>,
    Parent = Overview,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AutonomousSystemResolver<
    R = AutonomousSystem,
    Parent = Overview,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GeoResolver<R = GeoEcsFields, Parent = Overview, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace AutonomousSystemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AutonomousSystem> {
    number?: NumberResolver<Maybe<number>, TypeParent, TContext>;

    organization?: OrganizationResolver<Maybe<AutonomousSystemOrganization>, TypeParent, TContext>;
  }

  export type NumberResolver<
    R = Maybe<number>,
    Parent = AutonomousSystem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OrganizationResolver<
    R = Maybe<AutonomousSystemOrganization>,
    Parent = AutonomousSystem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AutonomousSystemOrganizationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AutonomousSystemOrganization> {
    name?: NameResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type NameResolver<
    R = Maybe<string>,
    Parent = AutonomousSystemOrganization,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersData> {
    edges?: EdgesResolver<UsersEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = UsersEdges[],
    Parent = UsersData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<R = number, Parent = UsersData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = UsersData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = UsersData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersEdges> {
    node?: NodeResolver<UsersNode, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<R = UsersNode, Parent = UsersEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type CursorResolver<
    R = CursorType,
    Parent = UsersEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersNodeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersNode> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    timestamp?: TimestampResolver<Maybe<string>, TypeParent, TContext>;

    user?: UserResolver<Maybe<UsersItem>, TypeParent, TContext>;
  }

  export type _IdResolver<R = Maybe<string>, Parent = UsersNode, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TimestampResolver<
    R = Maybe<string>,
    Parent = UsersNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UserResolver<
    R = Maybe<UsersItem>,
    Parent = UsersNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UsersItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UsersItem> {
    name?: NameResolver<Maybe<string>, TypeParent, TContext>;

    id?: IdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    groupId?: GroupIdResolver<Maybe<string[] | string>, TypeParent, TContext>;

    groupName?: GroupNameResolver<Maybe<string[] | string>, TypeParent, TContext>;

    count?: CountResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type NameResolver<
    R = Maybe<string>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<
    R = Maybe<string[] | string>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GroupIdResolver<
    R = Maybe<string[] | string>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GroupNameResolver<
    R = Maybe<string[] | string>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CountResolver<
    R = Maybe<number>,
    Parent = UsersItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiNetworkDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiNetworkData> {
    networkEvents?: NetworkEventsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueFlowId?: UniqueFlowIdResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourcePrivateIps?: UniqueSourcePrivateIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourcePrivateIpsHistogram?: UniqueSourcePrivateIpsHistogramResolver<
      Maybe<KpiNetworkHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueDestinationPrivateIps?: UniqueDestinationPrivateIpsResolver<
      Maybe<number>,
      TypeParent,
      TContext
    >;

    uniqueDestinationPrivateIpsHistogram?: UniqueDestinationPrivateIpsHistogramResolver<
      Maybe<KpiNetworkHistogramData[]>,
      TypeParent,
      TContext
    >;

    dnsQueries?: DnsQueriesResolver<Maybe<number>, TypeParent, TContext>;

    tlsHandshakes?: TlsHandshakesResolver<Maybe<number>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type NetworkEventsResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueFlowIdResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueSourcePrivateIpsResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueSourcePrivateIpsHistogramResolver<
    R = Maybe<KpiNetworkHistogramData[]>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDestinationPrivateIpsResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDestinationPrivateIpsHistogramResolver<
    R = Maybe<KpiNetworkHistogramData[]>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DnsQueriesResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TlsHandshakesResolver<
    R = Maybe<number>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = KpiNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiNetworkHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiNetworkHistogramData> {
    x?: XResolver<Maybe<number>, TypeParent, TContext>;

    y?: YResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type XResolver<
    R = Maybe<number>,
    Parent = KpiNetworkHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type YResolver<
    R = Maybe<number>,
    Parent = KpiNetworkHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiHostsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiHostsData> {
    hosts?: HostsResolver<Maybe<number>, TypeParent, TContext>;

    hostsHistogram?: HostsHistogramResolver<Maybe<KpiHostHistogramData[]>, TypeParent, TContext>;

    authSuccess?: AuthSuccessResolver<Maybe<number>, TypeParent, TContext>;

    authSuccessHistogram?: AuthSuccessHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    authFailure?: AuthFailureResolver<Maybe<number>, TypeParent, TContext>;

    authFailureHistogram?: AuthFailureHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueSourceIps?: UniqueSourceIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourceIpsHistogram?: UniqueSourceIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueDestinationIps?: UniqueDestinationIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueDestinationIpsHistogram?: UniqueDestinationIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type HostsResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HostsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthSuccessResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthSuccessHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthFailureResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthFailureHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueSourceIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueSourceIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDestinationIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDestinationIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = KpiHostsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiHostHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiHostHistogramData> {
    x?: XResolver<Maybe<number>, TypeParent, TContext>;

    y?: YResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type XResolver<
    R = Maybe<number>,
    Parent = KpiHostHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type YResolver<
    R = Maybe<number>,
    Parent = KpiHostHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KpiHostDetailsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KpiHostDetailsData> {
    authSuccess?: AuthSuccessResolver<Maybe<number>, TypeParent, TContext>;

    authSuccessHistogram?: AuthSuccessHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    authFailure?: AuthFailureResolver<Maybe<number>, TypeParent, TContext>;

    authFailureHistogram?: AuthFailureHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueSourceIps?: UniqueSourceIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueSourceIpsHistogram?: UniqueSourceIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    uniqueDestinationIps?: UniqueDestinationIpsResolver<Maybe<number>, TypeParent, TContext>;

    uniqueDestinationIpsHistogram?: UniqueDestinationIpsHistogramResolver<
      Maybe<KpiHostHistogramData[]>,
      TypeParent,
      TContext
    >;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type AuthSuccessResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthSuccessHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthFailureResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuthFailureHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueSourceIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueSourceIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDestinationIpsResolver<
    R = Maybe<number>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDestinationIpsHistogramResolver<
    R = Maybe<KpiHostHistogramData[]>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = KpiHostDetailsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopCountriesDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopCountriesData> {
    edges?: EdgesResolver<NetworkTopCountriesEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = NetworkTopCountriesEdges[],
    Parent = NetworkTopCountriesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkTopCountriesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = NetworkTopCountriesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = NetworkTopCountriesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopCountriesEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopCountriesEdges> {
    node?: NodeResolver<NetworkTopCountriesItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = NetworkTopCountriesItem,
    Parent = NetworkTopCountriesEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkTopCountriesEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopCountriesItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopCountriesItem> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    source?: SourceResolver<Maybe<TopCountriesItemSource>, TypeParent, TContext>;

    destination?: DestinationResolver<Maybe<TopCountriesItemDestination>, TypeParent, TContext>;

    network?: NetworkResolver<Maybe<TopNetworkTablesEcsField>, TypeParent, TContext>;
  }

  export type _IdResolver<
    R = Maybe<string>,
    Parent = NetworkTopCountriesItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceResolver<
    R = Maybe<TopCountriesItemSource>,
    Parent = NetworkTopCountriesItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationResolver<
    R = Maybe<TopCountriesItemDestination>,
    Parent = NetworkTopCountriesItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NetworkResolver<
    R = Maybe<TopNetworkTablesEcsField>,
    Parent = NetworkTopCountriesItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopCountriesItemSourceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopCountriesItemSource> {
    country?: CountryResolver<Maybe<string>, TypeParent, TContext>;

    destination_ips?: DestinationIpsResolver<Maybe<number>, TypeParent, TContext>;

    flows?: FlowsResolver<Maybe<number>, TypeParent, TContext>;

    location?: LocationResolver<Maybe<GeoItem>, TypeParent, TContext>;

    source_ips?: SourceIpsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type CountryResolver<
    R = Maybe<string>,
    Parent = TopCountriesItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationIpsResolver<
    R = Maybe<number>,
    Parent = TopCountriesItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FlowsResolver<
    R = Maybe<number>,
    Parent = TopCountriesItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocationResolver<
    R = Maybe<GeoItem>,
    Parent = TopCountriesItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceIpsResolver<
    R = Maybe<number>,
    Parent = TopCountriesItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace GeoItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = GeoItem> {
    geo?: GeoResolver<Maybe<GeoEcsFields>, TypeParent, TContext>;

    flowTarget?: FlowTargetResolver<Maybe<FlowTargetSourceDest>, TypeParent, TContext>;
  }

  export type GeoResolver<
    R = Maybe<GeoEcsFields>,
    Parent = GeoItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FlowTargetResolver<
    R = Maybe<FlowTargetSourceDest>,
    Parent = GeoItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopCountriesItemDestinationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopCountriesItemDestination> {
    country?: CountryResolver<Maybe<string>, TypeParent, TContext>;

    destination_ips?: DestinationIpsResolver<Maybe<number>, TypeParent, TContext>;

    flows?: FlowsResolver<Maybe<number>, TypeParent, TContext>;

    location?: LocationResolver<Maybe<GeoItem>, TypeParent, TContext>;

    source_ips?: SourceIpsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type CountryResolver<
    R = Maybe<string>,
    Parent = TopCountriesItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationIpsResolver<
    R = Maybe<number>,
    Parent = TopCountriesItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FlowsResolver<
    R = Maybe<number>,
    Parent = TopCountriesItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocationResolver<
    R = Maybe<GeoItem>,
    Parent = TopCountriesItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceIpsResolver<
    R = Maybe<number>,
    Parent = TopCountriesItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopNetworkTablesEcsFieldResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopNetworkTablesEcsField> {
    bytes_in?: BytesInResolver<Maybe<number>, TypeParent, TContext>;

    bytes_out?: BytesOutResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type BytesInResolver<
    R = Maybe<number>,
    Parent = TopNetworkTablesEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type BytesOutResolver<
    R = Maybe<number>,
    Parent = TopNetworkTablesEcsField,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopNFlowDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopNFlowData> {
    edges?: EdgesResolver<NetworkTopNFlowEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = NetworkTopNFlowEdges[],
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = NetworkTopNFlowData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopNFlowEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopNFlowEdges> {
    node?: NodeResolver<NetworkTopNFlowItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = NetworkTopNFlowItem,
    Parent = NetworkTopNFlowEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkTopNFlowEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkTopNFlowItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkTopNFlowItem> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    source?: SourceResolver<Maybe<TopNFlowItemSource>, TypeParent, TContext>;

    destination?: DestinationResolver<Maybe<TopNFlowItemDestination>, TypeParent, TContext>;

    network?: NetworkResolver<Maybe<TopNetworkTablesEcsField>, TypeParent, TContext>;
  }

  export type _IdResolver<
    R = Maybe<string>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceResolver<
    R = Maybe<TopNFlowItemSource>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationResolver<
    R = Maybe<TopNFlowItemDestination>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NetworkResolver<
    R = Maybe<TopNetworkTablesEcsField>,
    Parent = NetworkTopNFlowItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopNFlowItemSourceResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopNFlowItemSource> {
    autonomous_system?: AutonomousSystemResolver<Maybe<AutonomousSystemItem>, TypeParent, TContext>;

    domain?: DomainResolver<Maybe<string[]>, TypeParent, TContext>;

    ip?: IpResolver<Maybe<string>, TypeParent, TContext>;

    location?: LocationResolver<Maybe<GeoItem>, TypeParent, TContext>;

    flows?: FlowsResolver<Maybe<number>, TypeParent, TContext>;

    destination_ips?: DestinationIpsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type AutonomousSystemResolver<
    R = Maybe<AutonomousSystemItem>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DomainResolver<
    R = Maybe<string[]>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IpResolver<
    R = Maybe<string>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocationResolver<
    R = Maybe<GeoItem>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FlowsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DestinationIpsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemSource,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace AutonomousSystemItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = AutonomousSystemItem> {
    name?: NameResolver<Maybe<string>, TypeParent, TContext>;

    number?: NumberResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type NameResolver<
    R = Maybe<string>,
    Parent = AutonomousSystemItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NumberResolver<
    R = Maybe<number>,
    Parent = AutonomousSystemItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TopNFlowItemDestinationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TopNFlowItemDestination> {
    autonomous_system?: AutonomousSystemResolver<Maybe<AutonomousSystemItem>, TypeParent, TContext>;

    domain?: DomainResolver<Maybe<string[]>, TypeParent, TContext>;

    ip?: IpResolver<Maybe<string>, TypeParent, TContext>;

    location?: LocationResolver<Maybe<GeoItem>, TypeParent, TContext>;

    flows?: FlowsResolver<Maybe<number>, TypeParent, TContext>;

    source_ips?: SourceIpsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type AutonomousSystemResolver<
    R = Maybe<AutonomousSystemItem>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DomainResolver<
    R = Maybe<string[]>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IpResolver<
    R = Maybe<string>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LocationResolver<
    R = Maybe<GeoItem>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FlowsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SourceIpsResolver<
    R = Maybe<number>,
    Parent = TopNFlowItemDestination,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkDnsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkDnsData> {
    edges?: EdgesResolver<NetworkDnsEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;

    histogram?: HistogramResolver<Maybe<MatrixOverOrdinalHistogramData[]>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = NetworkDnsEdges[],
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HistogramResolver<
    R = Maybe<MatrixOverOrdinalHistogramData[]>,
    Parent = NetworkDnsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkDnsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkDnsEdges> {
    node?: NodeResolver<NetworkDnsItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = NetworkDnsItem,
    Parent = NetworkDnsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkDnsEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkDnsItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkDnsItem> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    dnsBytesIn?: DnsBytesInResolver<Maybe<number>, TypeParent, TContext>;

    dnsBytesOut?: DnsBytesOutResolver<Maybe<number>, TypeParent, TContext>;

    dnsName?: DnsNameResolver<Maybe<string>, TypeParent, TContext>;

    queryCount?: QueryCountResolver<Maybe<number>, TypeParent, TContext>;

    uniqueDomains?: UniqueDomainsResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type _IdResolver<
    R = Maybe<string>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DnsBytesInResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DnsBytesOutResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DnsNameResolver<
    R = Maybe<string>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QueryCountResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UniqueDomainsResolver<
    R = Maybe<number>,
    Parent = NetworkDnsItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace MatrixOverOrdinalHistogramDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = MatrixOverOrdinalHistogramData> {
    x?: XResolver<string, TypeParent, TContext>;

    y?: YResolver<number, TypeParent, TContext>;

    g?: GResolver<string, TypeParent, TContext>;
  }

  export type XResolver<
    R = string,
    Parent = MatrixOverOrdinalHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type YResolver<
    R = number,
    Parent = MatrixOverOrdinalHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type GResolver<
    R = string,
    Parent = MatrixOverOrdinalHistogramData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkHttpDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkHttpData> {
    edges?: EdgesResolver<NetworkHttpEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = NetworkHttpEdges[],
    Parent = NetworkHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = NetworkHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = NetworkHttpData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkHttpEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkHttpEdges> {
    node?: NodeResolver<NetworkHttpItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = NetworkHttpItem,
    Parent = NetworkHttpEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkHttpEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace NetworkHttpItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = NetworkHttpItem> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    domains?: DomainsResolver<string[], TypeParent, TContext>;

    lastHost?: LastHostResolver<Maybe<string>, TypeParent, TContext>;

    lastSourceIp?: LastSourceIpResolver<Maybe<string>, TypeParent, TContext>;

    methods?: MethodsResolver<string[], TypeParent, TContext>;

    path?: PathResolver<Maybe<string>, TypeParent, TContext>;

    requestCount?: RequestCountResolver<Maybe<number>, TypeParent, TContext>;

    statuses?: StatusesResolver<string[], TypeParent, TContext>;
  }

  export type _IdResolver<
    R = Maybe<string>,
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DomainsResolver<
    R = string[],
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LastHostResolver<
    R = Maybe<string>,
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type LastSourceIpResolver<
    R = Maybe<string>,
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MethodsResolver<
    R = string[],
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PathResolver<
    R = Maybe<string>,
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RequestCountResolver<
    R = Maybe<number>,
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type StatusesResolver<
    R = string[],
    Parent = NetworkHttpItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OverviewNetworkDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OverviewNetworkData> {
    auditbeatSocket?: AuditbeatSocketResolver<Maybe<number>, TypeParent, TContext>;

    filebeatCisco?: FilebeatCiscoResolver<Maybe<number>, TypeParent, TContext>;

    filebeatNetflow?: FilebeatNetflowResolver<Maybe<number>, TypeParent, TContext>;

    filebeatPanw?: FilebeatPanwResolver<Maybe<number>, TypeParent, TContext>;

    filebeatSuricata?: FilebeatSuricataResolver<Maybe<number>, TypeParent, TContext>;

    filebeatZeek?: FilebeatZeekResolver<Maybe<number>, TypeParent, TContext>;

    packetbeatDNS?: PacketbeatDnsResolver<Maybe<number>, TypeParent, TContext>;

    packetbeatFlow?: PacketbeatFlowResolver<Maybe<number>, TypeParent, TContext>;

    packetbeatTLS?: PacketbeatTlsResolver<Maybe<number>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type AuditbeatSocketResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilebeatCiscoResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilebeatNetflowResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilebeatPanwResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilebeatSuricataResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilebeatZeekResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PacketbeatDnsResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PacketbeatFlowResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PacketbeatTlsResolver<
    R = Maybe<number>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = OverviewNetworkData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OverviewHostDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OverviewHostData> {
    auditbeatAuditd?: AuditbeatAuditdResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatFIM?: AuditbeatFimResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatLogin?: AuditbeatLoginResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatPackage?: AuditbeatPackageResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatProcess?: AuditbeatProcessResolver<Maybe<number>, TypeParent, TContext>;

    auditbeatUser?: AuditbeatUserResolver<Maybe<number>, TypeParent, TContext>;

    endgameDns?: EndgameDnsResolver<Maybe<number>, TypeParent, TContext>;

    endgameFile?: EndgameFileResolver<Maybe<number>, TypeParent, TContext>;

    endgameImageLoad?: EndgameImageLoadResolver<Maybe<number>, TypeParent, TContext>;

    endgameNetwork?: EndgameNetworkResolver<Maybe<number>, TypeParent, TContext>;

    endgameProcess?: EndgameProcessResolver<Maybe<number>, TypeParent, TContext>;

    endgameRegistry?: EndgameRegistryResolver<Maybe<number>, TypeParent, TContext>;

    endgameSecurity?: EndgameSecurityResolver<Maybe<number>, TypeParent, TContext>;

    filebeatSystemModule?: FilebeatSystemModuleResolver<Maybe<number>, TypeParent, TContext>;

    winlogbeat?: WinlogbeatResolver<Maybe<number>, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type AuditbeatAuditdResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuditbeatFimResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuditbeatLoginResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuditbeatPackageResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuditbeatProcessResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AuditbeatUserResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameDnsResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameFileResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameImageLoadResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameNetworkResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameProcessResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameRegistryResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndgameSecurityResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FilebeatSystemModuleResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type WinlogbeatResolver<
    R = Maybe<number>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = OverviewHostData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsData> {
    edges?: EdgesResolver<TlsEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<R = TlsEdges[], Parent = TlsData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TotalCountResolver<R = number, Parent = TlsData, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = TlsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = TlsData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace TlsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsEdges> {
    node?: NodeResolver<TlsNode, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<R = TlsNode, Parent = TlsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type CursorResolver<R = CursorType, Parent = TlsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TlsNodeResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TlsNode> {
    _id?: _IdResolver<Maybe<string>, TypeParent, TContext>;

    timestamp?: TimestampResolver<Maybe<string>, TypeParent, TContext>;

    alternativeNames?: AlternativeNamesResolver<Maybe<string[]>, TypeParent, TContext>;

    notAfter?: NotAfterResolver<Maybe<string[]>, TypeParent, TContext>;

    commonNames?: CommonNamesResolver<Maybe<string[]>, TypeParent, TContext>;

    ja3?: Ja3Resolver<Maybe<string[]>, TypeParent, TContext>;

    issuerNames?: IssuerNamesResolver<Maybe<string[]>, TypeParent, TContext>;
  }

  export type _IdResolver<R = Maybe<string>, Parent = TlsNode, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type TimestampResolver<
    R = Maybe<string>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AlternativeNamesResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NotAfterResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CommonNamesResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type Ja3Resolver<R = Maybe<string[]>, Parent = TlsNode, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type IssuerNamesResolver<
    R = Maybe<string[]>,
    Parent = TlsNode,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UncommonProcessesDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UncommonProcessesData> {
    edges?: EdgesResolver<UncommonProcessesEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfoPaginated, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = UncommonProcessesEdges[],
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfoPaginated,
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = UncommonProcessesData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UncommonProcessesEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UncommonProcessesEdges> {
    node?: NodeResolver<UncommonProcessItem, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<
    R = UncommonProcessItem,
    Parent = UncommonProcessesEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CursorResolver<
    R = CursorType,
    Parent = UncommonProcessesEdges,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace UncommonProcessItemResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = UncommonProcessItem> {
    _id?: _IdResolver<string, TypeParent, TContext>;

    instances?: InstancesResolver<number, TypeParent, TContext>;

    process?: ProcessResolver<ProcessEcsFields, TypeParent, TContext>;

    hosts?: HostsResolver<HostEcsFields[], TypeParent, TContext>;

    user?: UserResolver<Maybe<UserEcsFields>, TypeParent, TContext>;
  }

  export type _IdResolver<
    R = string,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InstancesResolver<
    R = number,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ProcessResolver<
    R = ProcessEcsFields,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type HostsResolver<
    R = HostEcsFields[],
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UserResolver<
    R = Maybe<UserEcsFields>,
    Parent = UncommonProcessItem,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SayMyNameResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SayMyName> {
    /** The id of the source */
    appName?: AppNameResolver<string, TypeParent, TContext>;
  }

  export type AppNameResolver<R = string, Parent = SayMyName, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace TimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = TimelineResult> {
    columns?: ColumnsResolver<Maybe<ColumnHeaderResult[]>, TypeParent, TContext>;

    created?: CreatedResolver<Maybe<number>, TypeParent, TContext>;

    createdBy?: CreatedByResolver<Maybe<string>, TypeParent, TContext>;

    dataProviders?: DataProvidersResolver<Maybe<DataProviderResult[]>, TypeParent, TContext>;

    dateRange?: DateRangeResolver<Maybe<DateRangePickerResult>, TypeParent, TContext>;

    description?: DescriptionResolver<Maybe<string>, TypeParent, TContext>;

    eventIdToNoteIds?: EventIdToNoteIdsResolver<Maybe<NoteResult[]>, TypeParent, TContext>;

    favorite?: FavoriteResolver<Maybe<FavoriteTimelineResult[]>, TypeParent, TContext>;

    filters?: FiltersResolver<Maybe<FilterTimelineResult[]>, TypeParent, TContext>;

    kqlMode?: KqlModeResolver<Maybe<string>, TypeParent, TContext>;

    kqlQuery?: KqlQueryResolver<Maybe<SerializedFilterQueryResult>, TypeParent, TContext>;

    notes?: NotesResolver<Maybe<NoteResult[]>, TypeParent, TContext>;

    noteIds?: NoteIdsResolver<Maybe<string[]>, TypeParent, TContext>;

    pinnedEventIds?: PinnedEventIdsResolver<Maybe<string[]>, TypeParent, TContext>;

    pinnedEventsSaveObject?: PinnedEventsSaveObjectResolver<
      Maybe<PinnedEvent[]>,
      TypeParent,
      TContext
    >;

    savedQueryId?: SavedQueryIdResolver<Maybe<string>, TypeParent, TContext>;

    savedObjectId?: SavedObjectIdResolver<string, TypeParent, TContext>;

    sort?: SortResolver<Maybe<SortTimelineResult>, TypeParent, TContext>;

    title?: TitleResolver<Maybe<string>, TypeParent, TContext>;

    updated?: UpdatedResolver<Maybe<number>, TypeParent, TContext>;

    updatedBy?: UpdatedByResolver<Maybe<string>, TypeParent, TContext>;

    version?: VersionResolver<string, TypeParent, TContext>;
  }

  export type ColumnsResolver<
    R = Maybe<ColumnHeaderResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CreatedResolver<
    R = Maybe<number>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CreatedByResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DataProvidersResolver<
    R = Maybe<DataProviderResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DateRangeResolver<
    R = Maybe<DateRangePickerResult>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DescriptionResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EventIdToNoteIdsResolver<
    R = Maybe<NoteResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FavoriteResolver<
    R = Maybe<FavoriteTimelineResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FiltersResolver<
    R = Maybe<FilterTimelineResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KqlModeResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KqlQueryResolver<
    R = Maybe<SerializedFilterQueryResult>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NotesResolver<
    R = Maybe<NoteResult[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NoteIdsResolver<
    R = Maybe<string[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PinnedEventIdsResolver<
    R = Maybe<string[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PinnedEventsSaveObjectResolver<
    R = Maybe<PinnedEvent[]>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SavedQueryIdResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SavedObjectIdResolver<
    R = string,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SortResolver<
    R = Maybe<SortTimelineResult>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TitleResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UpdatedResolver<
    R = Maybe<number>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UpdatedByResolver<
    R = Maybe<string>,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = string,
    Parent = TimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ColumnHeaderResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ColumnHeaderResult> {
    aggregatable?: AggregatableResolver<Maybe<boolean>, TypeParent, TContext>;

    category?: CategoryResolver<Maybe<string>, TypeParent, TContext>;

    columnHeaderType?: ColumnHeaderTypeResolver<Maybe<string>, TypeParent, TContext>;

    description?: DescriptionResolver<Maybe<string>, TypeParent, TContext>;

    example?: ExampleResolver<Maybe<string>, TypeParent, TContext>;

    indexes?: IndexesResolver<Maybe<string[]>, TypeParent, TContext>;

    id?: IdResolver<Maybe<string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string>, TypeParent, TContext>;

    placeholder?: PlaceholderResolver<Maybe<string>, TypeParent, TContext>;

    searchable?: SearchableResolver<Maybe<boolean>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type AggregatableResolver<
    R = Maybe<boolean>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type CategoryResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ColumnHeaderTypeResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DescriptionResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ExampleResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IndexesResolver<
    R = Maybe<string[]>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PlaceholderResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SearchableResolver<
    R = Maybe<boolean>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string>,
    Parent = ColumnHeaderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DataProviderResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DataProviderResult> {
    id?: IdResolver<Maybe<string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string>, TypeParent, TContext>;

    enabled?: EnabledResolver<Maybe<boolean>, TypeParent, TContext>;

    excluded?: ExcludedResolver<Maybe<boolean>, TypeParent, TContext>;

    kqlQuery?: KqlQueryResolver<Maybe<string>, TypeParent, TContext>;

    queryMatch?: QueryMatchResolver<Maybe<QueryMatchResult>, TypeParent, TContext>;

    and?: AndResolver<Maybe<DataProviderResult[]>, TypeParent, TContext>;
  }

  export type IdResolver<
    R = Maybe<string>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EnabledResolver<
    R = Maybe<boolean>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ExcludedResolver<
    R = Maybe<boolean>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KqlQueryResolver<
    R = Maybe<string>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QueryMatchResolver<
    R = Maybe<QueryMatchResult>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type AndResolver<
    R = Maybe<DataProviderResult[]>,
    Parent = DataProviderResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace QueryMatchResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = QueryMatchResult> {
    field?: FieldResolver<Maybe<string>, TypeParent, TContext>;

    displayField?: DisplayFieldResolver<Maybe<string>, TypeParent, TContext>;

    value?: ValueResolver<Maybe<string>, TypeParent, TContext>;

    displayValue?: DisplayValueResolver<Maybe<string>, TypeParent, TContext>;

    operator?: OperatorResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type FieldResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DisplayFieldResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ValueResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DisplayValueResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OperatorResolver<
    R = Maybe<string>,
    Parent = QueryMatchResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace DateRangePickerResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = DateRangePickerResult> {
    start?: StartResolver<Maybe<number>, TypeParent, TContext>;

    end?: EndResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type StartResolver<
    R = Maybe<number>,
    Parent = DateRangePickerResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type EndResolver<
    R = Maybe<number>,
    Parent = DateRangePickerResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FavoriteTimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FavoriteTimelineResult> {
    fullName?: FullNameResolver<Maybe<string>, TypeParent, TContext>;

    userName?: UserNameResolver<Maybe<string>, TypeParent, TContext>;

    favoriteDate?: FavoriteDateResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type FullNameResolver<
    R = Maybe<string>,
    Parent = FavoriteTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type UserNameResolver<
    R = Maybe<string>,
    Parent = FavoriteTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FavoriteDateResolver<
    R = Maybe<number>,
    Parent = FavoriteTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FilterTimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FilterTimelineResult> {
    exists?: ExistsResolver<Maybe<string>, TypeParent, TContext>;

    meta?: MetaResolver<Maybe<FilterMetaTimelineResult>, TypeParent, TContext>;

    match_all?: MatchAllResolver<Maybe<string>, TypeParent, TContext>;

    missing?: MissingResolver<Maybe<string>, TypeParent, TContext>;

    query?: QueryResolver<Maybe<string>, TypeParent, TContext>;

    range?: RangeResolver<Maybe<string>, TypeParent, TContext>;

    script?: ScriptResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type ExistsResolver<
    R = Maybe<string>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MetaResolver<
    R = Maybe<FilterMetaTimelineResult>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MatchAllResolver<
    R = Maybe<string>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MissingResolver<
    R = Maybe<string>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type QueryResolver<
    R = Maybe<string>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type RangeResolver<
    R = Maybe<string>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ScriptResolver<
    R = Maybe<string>,
    Parent = FilterTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace FilterMetaTimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = FilterMetaTimelineResult> {
    alias?: AliasResolver<Maybe<string>, TypeParent, TContext>;

    controlledBy?: ControlledByResolver<Maybe<string>, TypeParent, TContext>;

    disabled?: DisabledResolver<Maybe<boolean>, TypeParent, TContext>;

    field?: FieldResolver<Maybe<string>, TypeParent, TContext>;

    formattedValue?: FormattedValueResolver<Maybe<string>, TypeParent, TContext>;

    index?: IndexResolver<Maybe<string>, TypeParent, TContext>;

    key?: KeyResolver<Maybe<string>, TypeParent, TContext>;

    negate?: NegateResolver<Maybe<boolean>, TypeParent, TContext>;

    params?: ParamsResolver<Maybe<string>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string>, TypeParent, TContext>;

    value?: ValueResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type AliasResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ControlledByResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type DisabledResolver<
    R = Maybe<boolean>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FieldResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FormattedValueResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IndexResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KeyResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NegateResolver<
    R = Maybe<boolean>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ParamsResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ValueResolver<
    R = Maybe<string>,
    Parent = FilterMetaTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SerializedFilterQueryResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SerializedFilterQueryResult> {
    filterQuery?: FilterQueryResolver<Maybe<SerializedKueryQueryResult>, TypeParent, TContext>;
  }

  export type FilterQueryResolver<
    R = Maybe<SerializedKueryQueryResult>,
    Parent = SerializedFilterQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SerializedKueryQueryResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SerializedKueryQueryResult> {
    kuery?: KueryResolver<Maybe<KueryFilterQueryResult>, TypeParent, TContext>;

    serializedQuery?: SerializedQueryResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type KueryResolver<
    R = Maybe<KueryFilterQueryResult>,
    Parent = SerializedKueryQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SerializedQueryResolver<
    R = Maybe<string>,
    Parent = SerializedKueryQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace KueryFilterQueryResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = KueryFilterQueryResult> {
    kind?: KindResolver<Maybe<string>, TypeParent, TContext>;

    expression?: ExpressionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type KindResolver<
    R = Maybe<string>,
    Parent = KueryFilterQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type ExpressionResolver<
    R = Maybe<string>,
    Parent = KueryFilterQueryResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace SortTimelineResultResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = SortTimelineResult> {
    columnId?: ColumnIdResolver<Maybe<string>, TypeParent, TContext>;

    sortDirection?: SortDirectionResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type ColumnIdResolver<
    R = Maybe<string>,
    Parent = SortTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SortDirectionResolver<
    R = Maybe<string>,
    Parent = SortTimelineResult,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseTimelinesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseTimelines> {
    timeline?: TimelineResolver<(Maybe<TimelineResult>)[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<Maybe<number>, TypeParent, TContext>;
  }

  export type TimelineResolver<
    R = (Maybe<TimelineResult>)[],
    Parent = ResponseTimelines,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = Maybe<number>,
    Parent = ResponseTimelines,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace MutationResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = {}> {
    /** Persists a note */
    persistNote?: PersistNoteResolver<ResponseNote, TypeParent, TContext>;

    deleteNote?: DeleteNoteResolver<Maybe<boolean>, TypeParent, TContext>;

    deleteNoteByTimelineId?: DeleteNoteByTimelineIdResolver<Maybe<boolean>, TypeParent, TContext>;
    /** Persists a pinned event in a timeline */
    persistPinnedEventOnTimeline?: PersistPinnedEventOnTimelineResolver<
      Maybe<PinnedEvent>,
      TypeParent,
      TContext
    >;
    /** Remove a pinned events in a timeline */
    deletePinnedEventOnTimeline?: DeletePinnedEventOnTimelineResolver<
      boolean,
      TypeParent,
      TContext
    >;
    /** Remove all pinned events in a timeline */
    deleteAllPinnedEventsOnTimeline?: DeleteAllPinnedEventsOnTimelineResolver<
      boolean,
      TypeParent,
      TContext
    >;
    /** Persists a timeline */
    persistTimeline?: PersistTimelineResolver<ResponseTimeline, TypeParent, TContext>;

    persistFavorite?: PersistFavoriteResolver<ResponseFavoriteTimeline, TypeParent, TContext>;

    deleteTimeline?: DeleteTimelineResolver<boolean, TypeParent, TContext>;
  }

  export type PersistNoteResolver<R = ResponseNote, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    PersistNoteArgs
  >;
  export interface PersistNoteArgs {
    noteId?: Maybe<string>;

    version?: Maybe<string>;

    note: NoteInput;
  }

  export type DeleteNoteResolver<
    R = Maybe<boolean>,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, DeleteNoteArgs>;
  export interface DeleteNoteArgs {
    id: string[];
  }

  export type DeleteNoteByTimelineIdResolver<
    R = Maybe<boolean>,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, DeleteNoteByTimelineIdArgs>;
  export interface DeleteNoteByTimelineIdArgs {
    timelineId: string;

    version?: Maybe<string>;
  }

  export type PersistPinnedEventOnTimelineResolver<
    R = Maybe<PinnedEvent>,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, PersistPinnedEventOnTimelineArgs>;
  export interface PersistPinnedEventOnTimelineArgs {
    pinnedEventId?: Maybe<string>;

    eventId: string;

    timelineId?: Maybe<string>;
  }

  export type DeletePinnedEventOnTimelineResolver<
    R = boolean,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, DeletePinnedEventOnTimelineArgs>;
  export interface DeletePinnedEventOnTimelineArgs {
    id: string[];
  }

  export type DeleteAllPinnedEventsOnTimelineResolver<
    R = boolean,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, DeleteAllPinnedEventsOnTimelineArgs>;
  export interface DeleteAllPinnedEventsOnTimelineArgs {
    timelineId: string;
  }

  export type PersistTimelineResolver<
    R = ResponseTimeline,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, PersistTimelineArgs>;
  export interface PersistTimelineArgs {
    id?: Maybe<string>;

    version?: Maybe<string>;

    timeline: TimelineInput;
  }

  export type PersistFavoriteResolver<
    R = ResponseFavoriteTimeline,
    Parent = {},
    TContext = SiemContext
  > = Resolver<R, Parent, TContext, PersistFavoriteArgs>;
  export interface PersistFavoriteArgs {
    timelineId?: Maybe<string>;
  }

  export type DeleteTimelineResolver<R = boolean, Parent = {}, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext,
    DeleteTimelineArgs
  >;
  export interface DeleteTimelineArgs {
    id: string[];
  }
}

export namespace ResponseNoteResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseNote> {
    code?: CodeResolver<Maybe<number>, TypeParent, TContext>;

    message?: MessageResolver<Maybe<string>, TypeParent, TContext>;

    note?: NoteResolver<NoteResult, TypeParent, TContext>;
  }

  export type CodeResolver<
    R = Maybe<number>,
    Parent = ResponseNote,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MessageResolver<
    R = Maybe<string>,
    Parent = ResponseNote,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NoteResolver<
    R = NoteResult,
    Parent = ResponseNote,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseTimelineResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseTimeline> {
    code?: CodeResolver<Maybe<number>, TypeParent, TContext>;

    message?: MessageResolver<Maybe<string>, TypeParent, TContext>;

    timeline?: TimelineResolver<TimelineResult, TypeParent, TContext>;
  }

  export type CodeResolver<
    R = Maybe<number>,
    Parent = ResponseTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MessageResolver<
    R = Maybe<string>,
    Parent = ResponseTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TimelineResolver<
    R = TimelineResult,
    Parent = ResponseTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace ResponseFavoriteTimelineResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = ResponseFavoriteTimeline> {
    code?: CodeResolver<Maybe<number>, TypeParent, TContext>;

    message?: MessageResolver<Maybe<string>, TypeParent, TContext>;

    savedObjectId?: SavedObjectIdResolver<string, TypeParent, TContext>;

    version?: VersionResolver<string, TypeParent, TContext>;

    favorite?: FavoriteResolver<Maybe<FavoriteTimelineResult[]>, TypeParent, TContext>;
  }

  export type CodeResolver<
    R = Maybe<number>,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MessageResolver<
    R = Maybe<string>,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type SavedObjectIdResolver<
    R = string,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = string,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type FavoriteResolver<
    R = Maybe<FavoriteTimelineResult[]>,
    Parent = ResponseFavoriteTimeline,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace EcsEdgesResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EcsEdges> {
    node?: NodeResolver<Ecs, TypeParent, TContext>;

    cursor?: CursorResolver<CursorType, TypeParent, TContext>;
  }

  export type NodeResolver<R = Ecs, Parent = EcsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type CursorResolver<R = CursorType, Parent = EcsEdges, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
}

export namespace EventsTimelineDataResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = EventsTimelineData> {
    edges?: EdgesResolver<EcsEdges[], TypeParent, TContext>;

    totalCount?: TotalCountResolver<number, TypeParent, TContext>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, TContext>;

    inspect?: InspectResolver<Maybe<Inspect>, TypeParent, TContext>;
  }

  export type EdgesResolver<
    R = EcsEdges[],
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TotalCountResolver<
    R = number,
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type InspectResolver<
    R = Maybe<Inspect>,
    Parent = EventsTimelineData,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace OsFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = OsFields> {
    platform?: PlatformResolver<Maybe<string>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string>, TypeParent, TContext>;

    full?: FullResolver<Maybe<string>, TypeParent, TContext>;

    family?: FamilyResolver<Maybe<string>, TypeParent, TContext>;

    version?: VersionResolver<Maybe<string>, TypeParent, TContext>;

    kernel?: KernelResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type PlatformResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<R = Maybe<string>, Parent = OsFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type FullResolver<R = Maybe<string>, Parent = OsFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type FamilyResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type VersionResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type KernelResolver<
    R = Maybe<string>,
    Parent = OsFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

export namespace HostFieldsResolvers {
  export interface Resolvers<TContext = SiemContext, TypeParent = HostFields> {
    architecture?: ArchitectureResolver<Maybe<string>, TypeParent, TContext>;

    id?: IdResolver<Maybe<string>, TypeParent, TContext>;

    ip?: IpResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;

    mac?: MacResolver<Maybe<(Maybe<string>)[]>, TypeParent, TContext>;

    name?: NameResolver<Maybe<string>, TypeParent, TContext>;

    os?: OsResolver<Maybe<OsFields>, TypeParent, TContext>;

    type?: TypeResolver<Maybe<string>, TypeParent, TContext>;
  }

  export type ArchitectureResolver<
    R = Maybe<string>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type IdResolver<R = Maybe<string>, Parent = HostFields, TContext = SiemContext> = Resolver<
    R,
    Parent,
    TContext
  >;
  export type IpResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type MacResolver<
    R = Maybe<(Maybe<string>)[]>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type NameResolver<
    R = Maybe<string>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type OsResolver<
    R = Maybe<OsFields>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
  export type TypeResolver<
    R = Maybe<string>,
    Parent = HostFields,
    TContext = SiemContext
  > = Resolver<R, Parent, TContext>;
}

/** Directs the executor to skip this field or fragment when the `if` argument is true. */
export type SkipDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  SkipDirectiveArgs,
  SiemContext
>;
export interface SkipDirectiveArgs {
  /** Skipped when true. */
  if: boolean;
}

/** Directs the executor to include this field or fragment only when the `if` argument is true. */
export type IncludeDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  IncludeDirectiveArgs,
  SiemContext
>;
export interface IncludeDirectiveArgs {
  /** Included when true. */
  if: boolean;
}

/** Marks an element of a GraphQL schema as no longer supported. */
export type DeprecatedDirectiveResolver<Result> = DirectiveResolverFn<
  Result,
  DeprecatedDirectiveArgs,
  SiemContext
>;
export interface DeprecatedDirectiveArgs {
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
  AlertsOverTimeData?: AlertsOverTimeDataResolvers.Resolvers<TContext>;
  Inspect?: InspectResolvers.Resolvers<TContext>;
  MatrixOverTimeHistogramData?: MatrixOverTimeHistogramDataResolvers.Resolvers<TContext>;
  AnomaliesOverTimeData?: AnomaliesOverTimeDataResolvers.Resolvers<TContext>;
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
  AuthenticationsOverTimeData?: AuthenticationsOverTimeDataResolvers.Resolvers<TContext>;
  TimelineData?: TimelineDataResolvers.Resolvers<TContext>;
  TimelineEdges?: TimelineEdgesResolvers.Resolvers<TContext>;
  TimelineItem?: TimelineItemResolvers.Resolvers<TContext>;
  TimelineNonEcsData?: TimelineNonEcsDataResolvers.Resolvers<TContext>;
  Ecs?: EcsResolvers.Resolvers<TContext>;
  AuditdEcsFields?: AuditdEcsFieldsResolvers.Resolvers<TContext>;
  AuditdData?: AuditdDataResolvers.Resolvers<TContext>;
  Summary?: SummaryResolvers.Resolvers<TContext>;
  PrimarySecondary?: PrimarySecondaryResolvers.Resolvers<TContext>;
  DestinationEcsFields?: DestinationEcsFieldsResolvers.Resolvers<TContext>;
  DnsEcsFields?: DnsEcsFieldsResolvers.Resolvers<TContext>;
  DnsQuestionData?: DnsQuestionDataResolvers.Resolvers<TContext>;
  EndgameEcsFields?: EndgameEcsFieldsResolvers.Resolvers<TContext>;
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
  WinlogEcsFields?: WinlogEcsFieldsResolvers.Resolvers<TContext>;
  ProcessEcsFields?: ProcessEcsFieldsResolvers.Resolvers<TContext>;
  ProcessHashData?: ProcessHashDataResolvers.Resolvers<TContext>;
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
  UsersData?: UsersDataResolvers.Resolvers<TContext>;
  UsersEdges?: UsersEdgesResolvers.Resolvers<TContext>;
  UsersNode?: UsersNodeResolvers.Resolvers<TContext>;
  UsersItem?: UsersItemResolvers.Resolvers<TContext>;
  KpiNetworkData?: KpiNetworkDataResolvers.Resolvers<TContext>;
  KpiNetworkHistogramData?: KpiNetworkHistogramDataResolvers.Resolvers<TContext>;
  KpiHostsData?: KpiHostsDataResolvers.Resolvers<TContext>;
  KpiHostHistogramData?: KpiHostHistogramDataResolvers.Resolvers<TContext>;
  KpiHostDetailsData?: KpiHostDetailsDataResolvers.Resolvers<TContext>;
  NetworkTopCountriesData?: NetworkTopCountriesDataResolvers.Resolvers<TContext>;
  NetworkTopCountriesEdges?: NetworkTopCountriesEdgesResolvers.Resolvers<TContext>;
  NetworkTopCountriesItem?: NetworkTopCountriesItemResolvers.Resolvers<TContext>;
  TopCountriesItemSource?: TopCountriesItemSourceResolvers.Resolvers<TContext>;
  GeoItem?: GeoItemResolvers.Resolvers<TContext>;
  TopCountriesItemDestination?: TopCountriesItemDestinationResolvers.Resolvers<TContext>;
  TopNetworkTablesEcsField?: TopNetworkTablesEcsFieldResolvers.Resolvers<TContext>;
  NetworkTopNFlowData?: NetworkTopNFlowDataResolvers.Resolvers<TContext>;
  NetworkTopNFlowEdges?: NetworkTopNFlowEdgesResolvers.Resolvers<TContext>;
  NetworkTopNFlowItem?: NetworkTopNFlowItemResolvers.Resolvers<TContext>;
  TopNFlowItemSource?: TopNFlowItemSourceResolvers.Resolvers<TContext>;
  AutonomousSystemItem?: AutonomousSystemItemResolvers.Resolvers<TContext>;
  TopNFlowItemDestination?: TopNFlowItemDestinationResolvers.Resolvers<TContext>;
  NetworkDnsData?: NetworkDnsDataResolvers.Resolvers<TContext>;
  NetworkDnsEdges?: NetworkDnsEdgesResolvers.Resolvers<TContext>;
  NetworkDnsItem?: NetworkDnsItemResolvers.Resolvers<TContext>;
  MatrixOverOrdinalHistogramData?: MatrixOverOrdinalHistogramDataResolvers.Resolvers<TContext>;
  NetworkHttpData?: NetworkHttpDataResolvers.Resolvers<TContext>;
  NetworkHttpEdges?: NetworkHttpEdgesResolvers.Resolvers<TContext>;
  NetworkHttpItem?: NetworkHttpItemResolvers.Resolvers<TContext>;
  OverviewNetworkData?: OverviewNetworkDataResolvers.Resolvers<TContext>;
  OverviewHostData?: OverviewHostDataResolvers.Resolvers<TContext>;
  TlsData?: TlsDataResolvers.Resolvers<TContext>;
  TlsEdges?: TlsEdgesResolvers.Resolvers<TContext>;
  TlsNode?: TlsNodeResolvers.Resolvers<TContext>;
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
  FilterTimelineResult?: FilterTimelineResultResolvers.Resolvers<TContext>;
  FilterMetaTimelineResult?: FilterMetaTimelineResultResolvers.Resolvers<TContext>;
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
  skip?: SkipDirectiveResolver<Result>;
  include?: IncludeDirectiveResolver<Result>;
  deprecated?: DeprecatedDirectiveResolver<Result>;
} & { [directiveName: string]: never };
