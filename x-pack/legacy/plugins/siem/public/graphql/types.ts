/* tslint:disable */
/* eslint-disable */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

  eventType?: Maybe<string>;

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

export type ToStringArray = string[];

export type Date = string;

export type ToNumberArray = number[];

export type ToDateArray = string[];

export type ToBooleanArray = boolean[];

export type ToAny = any;

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

  NetworkDnsHistogram: NetworkDsOverTimeData;

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

  matrixHistogramData: MatrixOverTimeHistogramData[];

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

  matrixHistogramData: MatrixOverTimeHistogramData[];

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
  domain?: Maybe<string[]>;

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

export interface AuthenticationsOverTimeData {
  inspect?: Maybe<Inspect>;

  matrixHistogramData: MatrixOverTimeHistogramData[];

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

  value?: Maybe<string[]>;
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

  rule?: Maybe<RuleEcsField>;

  signal?: Maybe<SignalField>;

  source?: Maybe<SourceEcsFields>;

  suricata?: Maybe<SuricataEcsFields>;

  tls?: Maybe<TlsEcsFields>;

  zeek?: Maybe<ZeekEcsFields>;

  http?: Maybe<HttpEcsFields>;

  url?: Maybe<UrlEcsFields>;

  timestamp?: Maybe<string>;

  message?: Maybe<string[]>;

  user?: Maybe<UserEcsFields>;

  winlog?: Maybe<WinlogEcsFields>;

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

export interface DnsEcsFields {
  question?: Maybe<DnsQuestionData>;

  resolved_ip?: Maybe<string[]>;

  response_code?: Maybe<string[]>;
}

export interface DnsQuestionData {
  name?: Maybe<string[]>;

  type?: Maybe<string[]>;
}

export interface EndgameEcsFields {
  exit_code?: Maybe<number[]>;

  file_name?: Maybe<string[]>;

  file_path?: Maybe<string[]>;

  logon_type?: Maybe<number[]>;

  parent_process_name?: Maybe<string[]>;

  pid?: Maybe<number[]>;

  process_name?: Maybe<string[]>;

  subject_domain_name?: Maybe<string[]>;

  subject_logon_id?: Maybe<string[]>;

  subject_user_name?: Maybe<string[]>;

  target_domain_name?: Maybe<string[]>;

  target_logon_id?: Maybe<string[]>;

  target_user_name?: Maybe<string[]>;
}

export interface EventEcsFields {
  action?: Maybe<string[]>;

  category?: Maybe<string[]>;

  code?: Maybe<string[]>;

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

export interface RuleEcsField {
  reference?: Maybe<string[]>;
}

export interface SignalField {
  rule?: Maybe<RuleField>;

  original_time?: Maybe<string[]>;
}

export interface RuleField {
  id?: Maybe<string[]>;

  rule_id?: Maybe<string[]>;

  false_positives: string[];

  saved_id?: Maybe<string[]>;

  timeline_id?: Maybe<string[]>;

  timeline_title?: Maybe<string[]>;

  max_signals?: Maybe<number[]>;

  risk_score?: Maybe<string[]>;

  output_index?: Maybe<string[]>;

  description?: Maybe<string[]>;

  from?: Maybe<string[]>;

  immutable?: Maybe<boolean[]>;

  index?: Maybe<string[]>;

  interval?: Maybe<string[]>;

  language?: Maybe<string[]>;

  query?: Maybe<string[]>;

  references?: Maybe<string[]>;

  severity?: Maybe<string[]>;

  tags?: Maybe<string[]>;

  threat?: Maybe<ToAny>;

  type?: Maybe<string[]>;

  size?: Maybe<string[]>;

  to?: Maybe<string[]>;

  enabled?: Maybe<boolean[]>;

  filters?: Maybe<ToAny>;

  created_at?: Maybe<string[]>;

  updated_at?: Maybe<string[]>;

  created_by?: Maybe<string[]>;

  updated_by?: Maybe<string[]>;

  version?: Maybe<string[]>;
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

export interface WinlogEcsFields {
  event_id?: Maybe<number[]>;
}

export interface ProcessEcsFields {
  hash?: Maybe<ProcessHashData>;

  pid?: Maybe<number[]>;

  name?: Maybe<string[]>;

  ppid?: Maybe<number[]>;

  args?: Maybe<string[]>;

  executable?: Maybe<string[]>;

  title?: Maybe<string[]>;

  thread?: Maybe<Thread>;

  working_directory?: Maybe<string[]>;
}

export interface ProcessHashData {
  md5?: Maybe<string[]>;

  sha1?: Maybe<string[]>;

  sha256?: Maybe<string[]>;
}

export interface Thread {
  id?: Maybe<number[]>;

  start?: Maybe<string[]>;
}

export interface FileFields {
  name?: Maybe<string[]>;

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

  matrixHistogramData: MatrixOverTimeHistogramData[];

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

export interface NetworkDsOverTimeData {
  inspect?: Maybe<Inspect>;

  matrixHistogramData: MatrixOverTimeHistogramData[];

  totalCount: number;
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

  winlogbeatSecurity?: Maybe<number>;

  winlogbeatMWSysmonOperational?: Maybe<number>;

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

  eventType?: Maybe<string>;

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

  stackByField?: Maybe<string>;
}
export interface AnomaliesHistogramSourceArgs {
  timerange: TimerangeInput;

  filterQuery?: Maybe<string>;

  defaultIndex: string[];

  stackByField?: Maybe<string>;
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

  stackByField?: Maybe<string>;
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

  stackByField?: Maybe<string>;
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

  stackByField?: Maybe<string>;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface NetworkDnsHistogramSourceArgs {
  filterQuery?: Maybe<string>;

  defaultIndex: string[];

  timerange: TimerangeInput;

  stackByField?: Maybe<string>;
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

// ====================================================
// Documents
// ====================================================

export namespace GetAuthenticationsQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInputPaginated;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Authentications: Authentications;
  };

  export type Authentications = {
    __typename?: 'AuthenticationsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'AuthenticationsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'AuthenticationItem';

    _id: string;

    failures: number;

    successes: number;

    user: User;

    lastSuccess: Maybe<LastSuccess>;

    lastFailure: Maybe<LastFailure>;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    name: Maybe<string[]>;
  };

  export type LastSuccess = {
    __typename?: 'LastSourceHost';

    timestamp: Maybe<string>;

    source: Maybe<_Source>;

    host: Maybe<Host>;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    ip: Maybe<string[]>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id: Maybe<string[]>;

    name: Maybe<string[]>;
  };

  export type LastFailure = {
    __typename?: 'LastSourceHost';

    timestamp: Maybe<string>;

    source: Maybe<__Source>;

    host: Maybe<_Host>;
  };

  export type __Source = {
    __typename?: 'SourceEcsFields';

    ip: Maybe<string[]>;
  };

  export type _Host = {
    __typename?: 'HostEcsFields';

    id: Maybe<string[]>;

    name: Maybe<string[]>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetLastEventTimeQuery {
  export type Variables = {
    sourceId: string;
    indexKey: LastEventIndexKey;
    details: LastTimeDetails;
    defaultIndex: string[];
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    LastEventTime: LastEventTime;
  };

  export type LastEventTime = {
    __typename?: 'LastEventTimeData';

    lastSeen: Maybe<string>;
  };
}

export namespace GetHostFirstLastSeenQuery {
  export type Variables = {
    sourceId: string;
    hostName: string;
    defaultIndex: string[];
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    HostFirstLastSeen: HostFirstLastSeen;
  };

  export type HostFirstLastSeen = {
    __typename?: 'FirstLastSeenHost';

    firstSeen: Maybe<string>;

    lastSeen: Maybe<string>;
  };
}

export namespace GetHostsTableQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInputPaginated;
    sort: HostsSortField;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Hosts: Hosts;
  };

  export type Hosts = {
    __typename?: 'HostsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'HostsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'HostItem';

    _id: Maybe<string>;

    lastSeen: Maybe<string>;

    host: Maybe<Host>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id: Maybe<string[]>;

    name: Maybe<string[]>;

    os: Maybe<Os>;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    name: Maybe<string[]>;

    version: Maybe<string[]>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetHostOverviewQuery {
  export type Variables = {
    sourceId: string;
    hostName: string;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    HostOverview: HostOverview;
  };

  export type HostOverview = {
    __typename?: 'HostItem';

    _id: Maybe<string>;

    host: Maybe<Host>;

    cloud: Maybe<Cloud>;

    inspect: Maybe<Inspect>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture: Maybe<string[]>;

    id: Maybe<string[]>;

    ip: Maybe<string[]>;

    mac: Maybe<string[]>;

    name: Maybe<string[]>;

    os: Maybe<Os>;

    type: Maybe<string[]>;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family: Maybe<string[]>;

    name: Maybe<string[]>;

    platform: Maybe<string[]>;

    version: Maybe<string[]>;
  };

  export type Cloud = {
    __typename?: 'CloudFields';

    instance: Maybe<Instance>;

    machine: Maybe<Machine>;

    provider: Maybe<(Maybe<string>)[]>;

    region: Maybe<(Maybe<string>)[]>;
  };

  export type Instance = {
    __typename?: 'CloudInstance';

    id: Maybe<(Maybe<string>)[]>;
  };

  export type Machine = {
    __typename?: 'CloudMachine';

    type: Maybe<(Maybe<string>)[]>;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetIpOverviewQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: Maybe<string>;
    ip: string;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    IpOverview: Maybe<IpOverview>;
  };

  export type IpOverview = {
    __typename?: 'IpOverviewData';

    source: Maybe<_Source>;

    destination: Maybe<Destination>;

    host: Host;

    inspect: Maybe<Inspect>;
  };

  export type _Source = {
    __typename?: 'Overview';

    firstSeen: Maybe<string>;

    lastSeen: Maybe<string>;

    autonomousSystem: AutonomousSystem;

    geo: Geo;
  };

  export type AutonomousSystem = {
    __typename?: 'AutonomousSystem';

    number: Maybe<number>;

    organization: Maybe<Organization>;
  };

  export type Organization = {
    __typename?: 'AutonomousSystemOrganization';

    name: Maybe<string>;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    continent_name: Maybe<string[]>;

    city_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;

    country_name: Maybe<string[]>;

    location: Maybe<Location>;

    region_iso_code: Maybe<string[]>;

    region_name: Maybe<string[]>;
  };

  export type Location = {
    __typename?: 'Location';

    lat: Maybe<number[]>;

    lon: Maybe<number[]>;
  };

  export type Destination = {
    __typename?: 'Overview';

    firstSeen: Maybe<string>;

    lastSeen: Maybe<string>;

    autonomousSystem: _AutonomousSystem;

    geo: _Geo;
  };

  export type _AutonomousSystem = {
    __typename?: 'AutonomousSystem';

    number: Maybe<number>;

    organization: Maybe<_Organization>;
  };

  export type _Organization = {
    __typename?: 'AutonomousSystemOrganization';

    name: Maybe<string>;
  };

  export type _Geo = {
    __typename?: 'GeoEcsFields';

    continent_name: Maybe<string[]>;

    city_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;

    country_name: Maybe<string[]>;

    location: Maybe<_Location>;

    region_iso_code: Maybe<string[]>;

    region_name: Maybe<string[]>;
  };

  export type _Location = {
    __typename?: 'Location';

    lat: Maybe<number[]>;

    lon: Maybe<number[]>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    architecture: Maybe<string[]>;

    id: Maybe<string[]>;

    ip: Maybe<string[]>;

    mac: Maybe<string[]>;

    name: Maybe<string[]>;

    os: Maybe<Os>;

    type: Maybe<string[]>;
  };

  export type Os = {
    __typename?: 'OsEcsFields';

    family: Maybe<string[]>;

    name: Maybe<string[]>;

    platform: Maybe<string[]>;

    version: Maybe<string[]>;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetKpiHostDetailsQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    KpiHostDetails: KpiHostDetails;
  };

  export type KpiHostDetails = {
    __typename?: 'KpiHostDetailsData';

    authSuccess: Maybe<number>;

    authSuccessHistogram: Maybe<AuthSuccessHistogram[]>;

    authFailure: Maybe<number>;

    authFailureHistogram: Maybe<AuthFailureHistogram[]>;

    uniqueSourceIps: Maybe<number>;

    uniqueSourceIpsHistogram: Maybe<UniqueSourceIpsHistogram[]>;

    uniqueDestinationIps: Maybe<number>;

    uniqueDestinationIpsHistogram: Maybe<UniqueDestinationIpsHistogram[]>;

    inspect: Maybe<Inspect>;
  };

  export type AuthSuccessHistogram = KpiHostDetailsChartFields.Fragment;

  export type AuthFailureHistogram = KpiHostDetailsChartFields.Fragment;

  export type UniqueSourceIpsHistogram = KpiHostDetailsChartFields.Fragment;

  export type UniqueDestinationIpsHistogram = KpiHostDetailsChartFields.Fragment;

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetKpiHostsQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    KpiHosts: KpiHosts;
  };

  export type KpiHosts = {
    __typename?: 'KpiHostsData';

    hosts: Maybe<number>;

    hostsHistogram: Maybe<HostsHistogram[]>;

    authSuccess: Maybe<number>;

    authSuccessHistogram: Maybe<AuthSuccessHistogram[]>;

    authFailure: Maybe<number>;

    authFailureHistogram: Maybe<AuthFailureHistogram[]>;

    uniqueSourceIps: Maybe<number>;

    uniqueSourceIpsHistogram: Maybe<UniqueSourceIpsHistogram[]>;

    uniqueDestinationIps: Maybe<number>;

    uniqueDestinationIpsHistogram: Maybe<UniqueDestinationIpsHistogram[]>;

    inspect: Maybe<Inspect>;
  };

  export type HostsHistogram = KpiHostChartFields.Fragment;

  export type AuthSuccessHistogram = KpiHostChartFields.Fragment;

  export type AuthFailureHistogram = KpiHostChartFields.Fragment;

  export type UniqueSourceIpsHistogram = KpiHostChartFields.Fragment;

  export type UniqueDestinationIpsHistogram = KpiHostChartFields.Fragment;

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetKpiNetworkQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    KpiNetwork: Maybe<KpiNetwork>;
  };

  export type KpiNetwork = {
    __typename?: 'KpiNetworkData';

    networkEvents: Maybe<number>;

    uniqueFlowId: Maybe<number>;

    uniqueSourcePrivateIps: Maybe<number>;

    uniqueSourcePrivateIpsHistogram: Maybe<UniqueSourcePrivateIpsHistogram[]>;

    uniqueDestinationPrivateIps: Maybe<number>;

    uniqueDestinationPrivateIpsHistogram: Maybe<UniqueDestinationPrivateIpsHistogram[]>;

    dnsQueries: Maybe<number>;

    tlsHandshakes: Maybe<number>;

    inspect: Maybe<Inspect>;
  };

  export type UniqueSourcePrivateIpsHistogram = KpiNetworkChartFields.Fragment;

  export type UniqueDestinationPrivateIpsHistogram = KpiNetworkChartFields.Fragment;

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetMatrixHistogramQuery {
  export type Variables = {
    isAlertsHistogram: boolean;
    isAnomaliesHistogram: boolean;
    isAuthenticationsHistogram: boolean;
    isDnsHistogram: boolean;
    defaultIndex: string[];
    isEventsHistogram: boolean;
    filterQuery?: Maybe<string>;
    inspect: boolean;
    sourceId: string;
    stackByField?: Maybe<string>;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    AlertsHistogram: AlertsHistogram;

    AnomaliesHistogram: AnomaliesHistogram;

    AuthenticationsHistogram: AuthenticationsHistogram;

    EventsHistogram: EventsHistogram;

    NetworkDnsHistogram: NetworkDnsHistogram;
  };

  export type AlertsHistogram = {
    __typename?: 'AlertsOverTimeData';

    matrixHistogramData: MatrixHistogramData[];

    totalCount: number;

    inspect: Maybe<Inspect>;
  };

  export type MatrixHistogramData = {
    __typename?: 'MatrixOverTimeHistogramData';

    x: number;

    y: number;

    g: string;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };

  export type AnomaliesHistogram = {
    __typename?: 'AnomaliesOverTimeData';

    matrixHistogramData: _MatrixHistogramData[];

    totalCount: number;

    inspect: Maybe<_Inspect>;
  };

  export type _MatrixHistogramData = {
    __typename?: 'MatrixOverTimeHistogramData';

    x: number;

    y: number;

    g: string;
  };

  export type _Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };

  export type AuthenticationsHistogram = {
    __typename?: 'AuthenticationsOverTimeData';

    matrixHistogramData: __MatrixHistogramData[];

    totalCount: number;

    inspect: Maybe<__Inspect>;
  };

  export type __MatrixHistogramData = {
    __typename?: 'MatrixOverTimeHistogramData';

    x: number;

    y: number;

    g: string;
  };

  export type __Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };

  export type EventsHistogram = {
    __typename?: 'EventsOverTimeData';

    matrixHistogramData: ___MatrixHistogramData[];

    totalCount: number;

    inspect: Maybe<___Inspect>;
  };

  export type ___MatrixHistogramData = {
    __typename?: 'MatrixOverTimeHistogramData';

    x: number;

    y: number;

    g: string;
  };

  export type ___Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };

  export type NetworkDnsHistogram = {
    __typename?: 'NetworkDsOverTimeData';

    matrixHistogramData: ____MatrixHistogramData[];

    totalCount: number;

    inspect: Maybe<____Inspect>;
  };

  export type ____MatrixHistogramData = {
    __typename?: 'MatrixOverTimeHistogramData';

    x: number;

    y: number;

    g: string;
  };

  export type ____Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetNetworkDnsQuery {
  export type Variables = {
    defaultIndex: string[];
    filterQuery?: Maybe<string>;
    inspect: boolean;
    isPtrIncluded: boolean;
    pagination: PaginationInputPaginated;
    sort: NetworkDnsSortField;
    sourceId: string;
    stackByField?: Maybe<string>;
    timerange: TimerangeInput;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    NetworkDns: NetworkDns;
  };

  export type NetworkDns = {
    __typename?: 'NetworkDnsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'NetworkDnsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'NetworkDnsItem';

    _id: Maybe<string>;

    dnsBytesIn: Maybe<number>;

    dnsBytesOut: Maybe<number>;

    dnsName: Maybe<string>;

    queryCount: Maybe<number>;

    uniqueDomains: Maybe<number>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetNetworkHttpQuery {
  export type Variables = {
    sourceId: string;
    ip?: Maybe<string>;
    filterQuery?: Maybe<string>;
    pagination: PaginationInputPaginated;
    sort: NetworkHttpSortField;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    NetworkHttp: NetworkHttp;
  };

  export type NetworkHttp = {
    __typename?: 'NetworkHttpData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'NetworkHttpEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'NetworkHttpItem';

    domains: string[];

    lastHost: Maybe<string>;

    lastSourceIp: Maybe<string>;

    methods: string[];

    path: Maybe<string>;

    requestCount: Maybe<number>;

    statuses: string[];
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetNetworkTopCountriesQuery {
  export type Variables = {
    sourceId: string;
    ip?: Maybe<string>;
    filterQuery?: Maybe<string>;
    pagination: PaginationInputPaginated;
    sort: NetworkTopTablesSortField;
    flowTarget: FlowTargetSourceDest;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    NetworkTopCountries: NetworkTopCountries;
  };

  export type NetworkTopCountries = {
    __typename?: 'NetworkTopCountriesData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'NetworkTopCountriesEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'NetworkTopCountriesItem';

    source: Maybe<_Source>;

    destination: Maybe<Destination>;

    network: Maybe<Network>;
  };

  export type _Source = {
    __typename?: 'TopCountriesItemSource';

    country: Maybe<string>;

    destination_ips: Maybe<number>;

    flows: Maybe<number>;

    source_ips: Maybe<number>;
  };

  export type Destination = {
    __typename?: 'TopCountriesItemDestination';

    country: Maybe<string>;

    destination_ips: Maybe<number>;

    flows: Maybe<number>;

    source_ips: Maybe<number>;
  };

  export type Network = {
    __typename?: 'TopNetworkTablesEcsField';

    bytes_in: Maybe<number>;

    bytes_out: Maybe<number>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetNetworkTopNFlowQuery {
  export type Variables = {
    sourceId: string;
    ip?: Maybe<string>;
    filterQuery?: Maybe<string>;
    pagination: PaginationInputPaginated;
    sort: NetworkTopTablesSortField;
    flowTarget: FlowTargetSourceDest;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    NetworkTopNFlow: NetworkTopNFlow;
  };

  export type NetworkTopNFlow = {
    __typename?: 'NetworkTopNFlowData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'NetworkTopNFlowEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'NetworkTopNFlowItem';

    source: Maybe<_Source>;

    destination: Maybe<Destination>;

    network: Maybe<Network>;
  };

  export type _Source = {
    __typename?: 'TopNFlowItemSource';

    autonomous_system: Maybe<AutonomousSystem>;

    domain: Maybe<string[]>;

    ip: Maybe<string>;

    location: Maybe<Location>;

    flows: Maybe<number>;

    destination_ips: Maybe<number>;
  };

  export type AutonomousSystem = {
    __typename?: 'AutonomousSystemItem';

    name: Maybe<string>;

    number: Maybe<number>;
  };

  export type Location = {
    __typename?: 'GeoItem';

    geo: Maybe<Geo>;

    flowTarget: Maybe<FlowTargetSourceDest>;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    continent_name: Maybe<string[]>;

    country_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;

    city_name: Maybe<string[]>;

    region_iso_code: Maybe<string[]>;

    region_name: Maybe<string[]>;
  };

  export type Destination = {
    __typename?: 'TopNFlowItemDestination';

    autonomous_system: Maybe<_AutonomousSystem>;

    domain: Maybe<string[]>;

    ip: Maybe<string>;

    location: Maybe<_Location>;

    flows: Maybe<number>;

    source_ips: Maybe<number>;
  };

  export type _AutonomousSystem = {
    __typename?: 'AutonomousSystemItem';

    name: Maybe<string>;

    number: Maybe<number>;
  };

  export type _Location = {
    __typename?: 'GeoItem';

    geo: Maybe<_Geo>;

    flowTarget: Maybe<FlowTargetSourceDest>;
  };

  export type _Geo = {
    __typename?: 'GeoEcsFields';

    continent_name: Maybe<string[]>;

    country_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;

    city_name: Maybe<string[]>;

    region_iso_code: Maybe<string[]>;

    region_name: Maybe<string[]>;
  };

  export type Network = {
    __typename?: 'TopNetworkTablesEcsField';

    bytes_in: Maybe<number>;

    bytes_out: Maybe<number>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetOverviewHostQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    OverviewHost: Maybe<OverviewHost>;
  };

  export type OverviewHost = {
    __typename?: 'OverviewHostData';

    auditbeatAuditd: Maybe<number>;

    auditbeatFIM: Maybe<number>;

    auditbeatLogin: Maybe<number>;

    auditbeatPackage: Maybe<number>;

    auditbeatProcess: Maybe<number>;

    auditbeatUser: Maybe<number>;

    endgameDns: Maybe<number>;

    endgameFile: Maybe<number>;

    endgameImageLoad: Maybe<number>;

    endgameNetwork: Maybe<number>;

    endgameProcess: Maybe<number>;

    endgameRegistry: Maybe<number>;

    endgameSecurity: Maybe<number>;

    filebeatSystemModule: Maybe<number>;

    winlogbeatSecurity: Maybe<number>;

    winlogbeatMWSysmonOperational: Maybe<number>;

    inspect: Maybe<Inspect>;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetOverviewNetworkQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    OverviewNetwork: Maybe<OverviewNetwork>;
  };

  export type OverviewNetwork = {
    __typename?: 'OverviewNetworkData';

    auditbeatSocket: Maybe<number>;

    filebeatCisco: Maybe<number>;

    filebeatNetflow: Maybe<number>;

    filebeatPanw: Maybe<number>;

    filebeatSuricata: Maybe<number>;

    filebeatZeek: Maybe<number>;

    packetbeatDNS: Maybe<number>;

    packetbeatFlow: Maybe<number>;

    packetbeatTLS: Maybe<number>;

    inspect: Maybe<Inspect>;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace SourceQuery {
  export type Variables = {
    sourceId?: Maybe<string>;
    defaultIndex: string[];
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    status: Status;
  };

  export type Status = {
    __typename?: 'SourceStatus';

    indicesExist: boolean;

    indexFields: IndexFields[];
  };

  export type IndexFields = {
    __typename?: 'IndexField';

    category: string;

    description: Maybe<string>;

    example: Maybe<string>;

    indexes: (Maybe<string>)[];

    name: string;

    searchable: boolean;

    type: string;

    aggregatable: boolean;

    format: Maybe<string>;
  };
}

export namespace GetAllTimeline {
  export type Variables = {
    pageInfo: PageInfoTimeline;
    search?: Maybe<string>;
    sort?: Maybe<SortTimeline>;
    onlyUserFavorite?: Maybe<boolean>;
  };

  export type Query = {
    __typename?: 'Query';

    getAllTimeline: GetAllTimeline;
  };

  export type GetAllTimeline = {
    __typename?: 'ResponseTimelines';

    totalCount: Maybe<number>;

    timeline: (Maybe<Timeline>)[];
  };

  export type Timeline = {
    __typename?: 'TimelineResult';

    savedObjectId: string;

    description: Maybe<string>;

    favorite: Maybe<Favorite[]>;

    eventIdToNoteIds: Maybe<EventIdToNoteIds[]>;

    notes: Maybe<Notes[]>;

    noteIds: Maybe<string[]>;

    pinnedEventIds: Maybe<string[]>;

    title: Maybe<string>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: string;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };

  export type EventIdToNoteIds = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    timelineVersion: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type Notes = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}

export namespace DeleteTimelineMutation {
  export type Variables = {
    id: string[];
  };

  export type Mutation = {
    __typename?: 'Mutation';

    deleteTimeline: boolean;
  };
}

export namespace GetTimelineDetailsQuery {
  export type Variables = {
    sourceId: string;
    eventId: string;
    indexName: string;
    defaultIndex: string[];
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    TimelineDetails: TimelineDetails;
  };

  export type TimelineDetails = {
    __typename?: 'TimelineDetailsData';

    data: Maybe<Data[]>;
  };

  export type Data = {
    __typename?: 'DetailItem';

    field: string;

    values: Maybe<string[]>;

    originalValue: Maybe<EsValue>;
  };
}

export namespace PersistTimelineFavoriteMutation {
  export type Variables = {
    timelineId?: Maybe<string>;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistFavorite: PersistFavorite;
  };

  export type PersistFavorite = {
    __typename?: 'ResponseFavoriteTimeline';

    savedObjectId: string;

    version: string;

    favorite: Maybe<Favorite[]>;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };
}

export namespace GetTimelineQuery {
  export type Variables = {
    sourceId: string;
    fieldRequested: string[];
    pagination: PaginationInput;
    sortField: SortField;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Timeline: Timeline;
  };

  export type Timeline = {
    __typename?: 'TimelineData';

    totalCount: number;

    inspect: Maybe<Inspect>;

    pageInfo: PageInfo;

    edges: Edges[];
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };

  export type PageInfo = {
    __typename?: 'PageInfo';

    endCursor: Maybe<EndCursor>;

    hasNextPage: Maybe<boolean>;
  };

  export type EndCursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;

    tiebreaker: Maybe<string>;
  };

  export type Edges = {
    __typename?: 'TimelineEdges';

    node: Node;
  };

  export type Node = {
    __typename?: 'TimelineItem';

    _id: string;

    _index: Maybe<string>;

    data: Data[];

    ecs: Ecs;
  };

  export type Data = {
    __typename?: 'TimelineNonEcsData';

    field: string;

    value: Maybe<string[]>;
  };

  export type Ecs = {
    __typename?: 'ECS';

    _id: string;

    _index: Maybe<string>;

    timestamp: Maybe<string>;

    message: Maybe<string[]>;

    system: Maybe<System>;

    event: Maybe<Event>;

    auditd: Maybe<Auditd>;

    file: Maybe<File>;

    host: Maybe<Host>;

    rule: Maybe<Rule>;

    source: Maybe<_Source>;

    destination: Maybe<Destination>;

    dns: Maybe<Dns>;

    endgame: Maybe<Endgame>;

    geo: Maybe<__Geo>;

    signal: Maybe<Signal>;

    suricata: Maybe<Suricata>;

    network: Maybe<Network>;

    http: Maybe<Http>;

    tls: Maybe<Tls>;

    url: Maybe<Url>;

    user: Maybe<User>;

    winlog: Maybe<Winlog>;

    process: Maybe<Process>;

    zeek: Maybe<Zeek>;
  };

  export type System = {
    __typename?: 'SystemEcsField';

    auth: Maybe<Auth>;

    audit: Maybe<Audit>;
  };

  export type Auth = {
    __typename?: 'AuthEcsFields';

    ssh: Maybe<Ssh>;
  };

  export type Ssh = {
    __typename?: 'SshEcsFields';

    signature: Maybe<string[]>;

    method: Maybe<string[]>;
  };

  export type Audit = {
    __typename?: 'AuditEcsFields';

    package: Maybe<Package>;
  };

  export type Package = {
    __typename?: 'PackageEcsFields';

    arch: Maybe<string[]>;

    entity_id: Maybe<string[]>;

    name: Maybe<string[]>;

    size: Maybe<number[]>;

    summary: Maybe<string[]>;

    version: Maybe<string[]>;
  };

  export type Event = {
    __typename?: 'EventEcsFields';

    action: Maybe<string[]>;

    category: Maybe<string[]>;

    code: Maybe<string[]>;

    created: Maybe<string[]>;

    dataset: Maybe<string[]>;

    duration: Maybe<number[]>;

    end: Maybe<string[]>;

    hash: Maybe<string[]>;

    id: Maybe<string[]>;

    kind: Maybe<string[]>;

    module: Maybe<string[]>;

    original: Maybe<string[]>;

    outcome: Maybe<string[]>;

    risk_score: Maybe<number[]>;

    risk_score_norm: Maybe<number[]>;

    severity: Maybe<number[]>;

    start: Maybe<string[]>;

    timezone: Maybe<string[]>;

    type: Maybe<string[]>;
  };

  export type Auditd = {
    __typename?: 'AuditdEcsFields';

    result: Maybe<string[]>;

    session: Maybe<string[]>;

    data: Maybe<_Data>;

    summary: Maybe<Summary>;
  };

  export type _Data = {
    __typename?: 'AuditdData';

    acct: Maybe<string[]>;

    terminal: Maybe<string[]>;

    op: Maybe<string[]>;
  };

  export type Summary = {
    __typename?: 'Summary';

    actor: Maybe<Actor>;

    object: Maybe<Object>;

    how: Maybe<string[]>;

    message_type: Maybe<string[]>;

    sequence: Maybe<string[]>;
  };

  export type Actor = {
    __typename?: 'PrimarySecondary';

    primary: Maybe<string[]>;

    secondary: Maybe<string[]>;
  };

  export type Object = {
    __typename?: 'PrimarySecondary';

    primary: Maybe<string[]>;

    secondary: Maybe<string[]>;

    type: Maybe<string[]>;
  };

  export type File = {
    __typename?: 'FileFields';

    name: Maybe<string[]>;

    path: Maybe<string[]>;

    target_path: Maybe<string[]>;

    extension: Maybe<string[]>;

    type: Maybe<string[]>;

    device: Maybe<string[]>;

    inode: Maybe<string[]>;

    uid: Maybe<string[]>;

    owner: Maybe<string[]>;

    gid: Maybe<string[]>;

    group: Maybe<string[]>;

    mode: Maybe<string[]>;

    size: Maybe<number[]>;

    mtime: Maybe<string[]>;

    ctime: Maybe<string[]>;
  };

  export type Host = {
    __typename?: 'HostEcsFields';

    id: Maybe<string[]>;

    name: Maybe<string[]>;

    ip: Maybe<string[]>;
  };

  export type Rule = {
    __typename?: 'RuleEcsField';

    reference: Maybe<string[]>;
  };

  export type _Source = {
    __typename?: 'SourceEcsFields';

    bytes: Maybe<number[]>;

    ip: Maybe<string[]>;

    packets: Maybe<number[]>;

    port: Maybe<number[]>;

    geo: Maybe<Geo>;
  };

  export type Geo = {
    __typename?: 'GeoEcsFields';

    continent_name: Maybe<string[]>;

    country_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;

    city_name: Maybe<string[]>;

    region_iso_code: Maybe<string[]>;

    region_name: Maybe<string[]>;
  };

  export type Destination = {
    __typename?: 'DestinationEcsFields';

    bytes: Maybe<number[]>;

    ip: Maybe<string[]>;

    packets: Maybe<number[]>;

    port: Maybe<number[]>;

    geo: Maybe<_Geo>;
  };

  export type _Geo = {
    __typename?: 'GeoEcsFields';

    continent_name: Maybe<string[]>;

    country_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;

    city_name: Maybe<string[]>;

    region_iso_code: Maybe<string[]>;

    region_name: Maybe<string[]>;
  };

  export type Dns = {
    __typename?: 'DnsEcsFields';

    question: Maybe<Question>;

    resolved_ip: Maybe<string[]>;

    response_code: Maybe<string[]>;
  };

  export type Question = {
    __typename?: 'DnsQuestionData';

    name: Maybe<string[]>;

    type: Maybe<string[]>;
  };

  export type Endgame = {
    __typename?: 'EndgameEcsFields';

    exit_code: Maybe<number[]>;

    file_name: Maybe<string[]>;

    file_path: Maybe<string[]>;

    logon_type: Maybe<number[]>;

    parent_process_name: Maybe<string[]>;

    pid: Maybe<number[]>;

    process_name: Maybe<string[]>;

    subject_domain_name: Maybe<string[]>;

    subject_logon_id: Maybe<string[]>;

    subject_user_name: Maybe<string[]>;

    target_domain_name: Maybe<string[]>;

    target_logon_id: Maybe<string[]>;

    target_user_name: Maybe<string[]>;
  };

  export type __Geo = {
    __typename?: 'GeoEcsFields';

    region_name: Maybe<string[]>;

    country_iso_code: Maybe<string[]>;
  };

  export type Signal = {
    __typename?: 'SignalField';

    original_time: Maybe<string[]>;

    rule: Maybe<_Rule>;
  };

  export type _Rule = {
    __typename?: 'RuleField';

    id: Maybe<string[]>;

    saved_id: Maybe<string[]>;

    timeline_id: Maybe<string[]>;

    timeline_title: Maybe<string[]>;

    output_index: Maybe<string[]>;

    from: Maybe<string[]>;

    index: Maybe<string[]>;

    language: Maybe<string[]>;

    query: Maybe<string[]>;

    to: Maybe<string[]>;

    filters: Maybe<ToAny>;
  };

  export type Suricata = {
    __typename?: 'SuricataEcsFields';

    eve: Maybe<Eve>;
  };

  export type Eve = {
    __typename?: 'SuricataEveData';

    proto: Maybe<string[]>;

    flow_id: Maybe<number[]>;

    alert: Maybe<Alert>;
  };

  export type Alert = {
    __typename?: 'SuricataAlertData';

    signature: Maybe<string[]>;

    signature_id: Maybe<number[]>;
  };

  export type Network = {
    __typename?: 'NetworkEcsField';

    bytes: Maybe<number[]>;

    community_id: Maybe<string[]>;

    direction: Maybe<string[]>;

    packets: Maybe<number[]>;

    protocol: Maybe<string[]>;

    transport: Maybe<string[]>;
  };

  export type Http = {
    __typename?: 'HttpEcsFields';

    version: Maybe<string[]>;

    request: Maybe<Request>;

    response: Maybe<Response>;
  };

  export type Request = {
    __typename?: 'HttpRequestData';

    method: Maybe<string[]>;

    body: Maybe<Body>;

    referrer: Maybe<string[]>;
  };

  export type Body = {
    __typename?: 'HttpBodyData';

    bytes: Maybe<number[]>;

    content: Maybe<string[]>;
  };

  export type Response = {
    __typename?: 'HttpResponseData';

    status_code: Maybe<number[]>;

    body: Maybe<_Body>;
  };

  export type _Body = {
    __typename?: 'HttpBodyData';

    bytes: Maybe<number[]>;

    content: Maybe<string[]>;
  };

  export type Tls = {
    __typename?: 'TlsEcsFields';

    client_certificate: Maybe<ClientCertificate>;

    fingerprints: Maybe<Fingerprints>;

    server_certificate: Maybe<ServerCertificate>;
  };

  export type ClientCertificate = {
    __typename?: 'TlsClientCertificateData';

    fingerprint: Maybe<Fingerprint>;
  };

  export type Fingerprint = {
    __typename?: 'FingerprintData';

    sha1: Maybe<string[]>;
  };

  export type Fingerprints = {
    __typename?: 'TlsFingerprintsData';

    ja3: Maybe<Ja3>;
  };

  export type Ja3 = {
    __typename?: 'TlsJa3Data';

    hash: Maybe<string[]>;
  };

  export type ServerCertificate = {
    __typename?: 'TlsServerCertificateData';

    fingerprint: Maybe<_Fingerprint>;
  };

  export type _Fingerprint = {
    __typename?: 'FingerprintData';

    sha1: Maybe<string[]>;
  };

  export type Url = {
    __typename?: 'UrlEcsFields';

    original: Maybe<string[]>;

    domain: Maybe<string[]>;

    username: Maybe<string[]>;

    password: Maybe<string[]>;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    domain: Maybe<string[]>;

    name: Maybe<string[]>;
  };

  export type Winlog = {
    __typename?: 'WinlogEcsFields';

    event_id: Maybe<number[]>;
  };

  export type Process = {
    __typename?: 'ProcessEcsFields';

    hash: Maybe<Hash>;

    pid: Maybe<number[]>;

    name: Maybe<string[]>;

    ppid: Maybe<number[]>;

    args: Maybe<string[]>;

    executable: Maybe<string[]>;

    title: Maybe<string[]>;

    working_directory: Maybe<string[]>;
  };

  export type Hash = {
    __typename?: 'ProcessHashData';

    md5: Maybe<string[]>;

    sha1: Maybe<string[]>;

    sha256: Maybe<string[]>;
  };

  export type Zeek = {
    __typename?: 'ZeekEcsFields';

    session_id: Maybe<string[]>;

    connection: Maybe<Connection>;

    notice: Maybe<Notice>;

    dns: Maybe<_Dns>;

    http: Maybe<_Http>;

    files: Maybe<Files>;

    ssl: Maybe<Ssl>;
  };

  export type Connection = {
    __typename?: 'ZeekConnectionData';

    local_resp: Maybe<boolean[]>;

    local_orig: Maybe<boolean[]>;

    missed_bytes: Maybe<number[]>;

    state: Maybe<string[]>;

    history: Maybe<string[]>;
  };

  export type Notice = {
    __typename?: 'ZeekNoticeData';

    suppress_for: Maybe<number[]>;

    msg: Maybe<string[]>;

    note: Maybe<string[]>;

    sub: Maybe<string[]>;

    dst: Maybe<string[]>;

    dropped: Maybe<boolean[]>;

    peer_descr: Maybe<string[]>;
  };

  export type _Dns = {
    __typename?: 'ZeekDnsData';

    AA: Maybe<boolean[]>;

    qclass_name: Maybe<string[]>;

    RD: Maybe<boolean[]>;

    qtype_name: Maybe<string[]>;

    rejected: Maybe<boolean[]>;

    qtype: Maybe<string[]>;

    query: Maybe<string[]>;

    trans_id: Maybe<number[]>;

    qclass: Maybe<string[]>;

    RA: Maybe<boolean[]>;

    TC: Maybe<boolean[]>;
  };

  export type _Http = {
    __typename?: 'ZeekHttpData';

    resp_mime_types: Maybe<string[]>;

    trans_depth: Maybe<string[]>;

    status_msg: Maybe<string[]>;

    resp_fuids: Maybe<string[]>;

    tags: Maybe<string[]>;
  };

  export type Files = {
    __typename?: 'ZeekFileData';

    session_ids: Maybe<string[]>;

    timedout: Maybe<boolean[]>;

    local_orig: Maybe<boolean[]>;

    tx_host: Maybe<string[]>;

    source: Maybe<string[]>;

    is_orig: Maybe<boolean[]>;

    overflow_bytes: Maybe<number[]>;

    sha1: Maybe<string[]>;

    duration: Maybe<number[]>;

    depth: Maybe<number[]>;

    analyzers: Maybe<string[]>;

    mime_type: Maybe<string[]>;

    rx_host: Maybe<string[]>;

    total_bytes: Maybe<number[]>;

    fuid: Maybe<string[]>;

    seen_bytes: Maybe<number[]>;

    missing_bytes: Maybe<number[]>;

    md5: Maybe<string[]>;
  };

  export type Ssl = {
    __typename?: 'ZeekSslData';

    cipher: Maybe<string[]>;

    established: Maybe<boolean[]>;

    resumed: Maybe<boolean[]>;

    version: Maybe<string[]>;
  };
}

export namespace PersistTimelineNoteMutation {
  export type Variables = {
    noteId?: Maybe<string>;
    version?: Maybe<string>;
    note: NoteInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistNote: PersistNote;
  };

  export type PersistNote = {
    __typename?: 'ResponseNote';

    code: Maybe<number>;

    message: Maybe<string>;

    note: Note;
  };

  export type Note = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}

export namespace GetOneTimeline {
  export type Variables = {
    id: string;
  };

  export type Query = {
    __typename?: 'Query';

    getOneTimeline: GetOneTimeline;
  };

  export type GetOneTimeline = {
    __typename?: 'TimelineResult';

    savedObjectId: string;

    columns: Maybe<Columns[]>;

    dataProviders: Maybe<DataProviders[]>;

    dateRange: Maybe<DateRange>;

    description: Maybe<string>;

    eventType: Maybe<string>;

    eventIdToNoteIds: Maybe<EventIdToNoteIds[]>;

    favorite: Maybe<Favorite[]>;

    filters: Maybe<Filters[]>;

    kqlMode: Maybe<string>;

    kqlQuery: Maybe<KqlQuery>;

    notes: Maybe<Notes[]>;

    noteIds: Maybe<string[]>;

    pinnedEventIds: Maybe<string[]>;

    pinnedEventsSaveObject: Maybe<PinnedEventsSaveObject[]>;

    title: Maybe<string>;

    savedQueryId: Maybe<string>;

    sort: Maybe<Sort>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: string;
  };

  export type Columns = {
    __typename?: 'ColumnHeaderResult';

    aggregatable: Maybe<boolean>;

    category: Maybe<string>;

    columnHeaderType: Maybe<string>;

    description: Maybe<string>;

    example: Maybe<string>;

    indexes: Maybe<string[]>;

    id: Maybe<string>;

    name: Maybe<string>;

    searchable: Maybe<boolean>;

    type: Maybe<string>;
  };

  export type DataProviders = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    queryMatch: Maybe<QueryMatch>;

    and: Maybe<And[]>;
  };

  export type QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type And = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    queryMatch: Maybe<_QueryMatch>;
  };

  export type _QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type DateRange = {
    __typename?: 'DateRangePickerResult';

    start: Maybe<number>;

    end: Maybe<number>;
  };

  export type EventIdToNoteIds = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    timelineVersion: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };

  export type Filters = {
    __typename?: 'FilterTimelineResult';

    meta: Maybe<Meta>;

    query: Maybe<string>;

    exists: Maybe<string>;

    match_all: Maybe<string>;

    missing: Maybe<string>;

    range: Maybe<string>;

    script: Maybe<string>;
  };

  export type Meta = {
    __typename?: 'FilterMetaTimelineResult';

    alias: Maybe<string>;

    controlledBy: Maybe<string>;

    disabled: Maybe<boolean>;

    field: Maybe<string>;

    formattedValue: Maybe<string>;

    index: Maybe<string>;

    key: Maybe<string>;

    negate: Maybe<boolean>;

    params: Maybe<string>;

    type: Maybe<string>;

    value: Maybe<string>;
  };

  export type KqlQuery = {
    __typename?: 'SerializedFilterQueryResult';

    filterQuery: Maybe<FilterQuery>;
  };

  export type FilterQuery = {
    __typename?: 'SerializedKueryQueryResult';

    kuery: Maybe<Kuery>;

    serializedQuery: Maybe<string>;
  };

  export type Kuery = {
    __typename?: 'KueryFilterQueryResult';

    kind: Maybe<string>;

    expression: Maybe<string>;
  };

  export type Notes = {
    __typename?: 'NoteResult';

    eventId: Maybe<string>;

    note: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    noteId: string;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type PinnedEventsSaveObject = {
    __typename?: 'PinnedEvent';

    pinnedEventId: string;

    eventId: Maybe<string>;

    timelineId: Maybe<string>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };

  export type Sort = {
    __typename?: 'SortTimelineResult';

    columnId: Maybe<string>;

    sortDirection: Maybe<string>;
  };
}

export namespace PersistTimelineMutation {
  export type Variables = {
    timelineId?: Maybe<string>;
    version?: Maybe<string>;
    timeline: TimelineInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistTimeline: PersistTimeline;
  };

  export type PersistTimeline = {
    __typename?: 'ResponseTimeline';

    code: Maybe<number>;

    message: Maybe<string>;

    timeline: Timeline;
  };

  export type Timeline = {
    __typename?: 'TimelineResult';

    savedObjectId: string;

    version: string;

    columns: Maybe<Columns[]>;

    dataProviders: Maybe<DataProviders[]>;

    description: Maybe<string>;

    eventType: Maybe<string>;

    favorite: Maybe<Favorite[]>;

    filters: Maybe<Filters[]>;

    kqlMode: Maybe<string>;

    kqlQuery: Maybe<KqlQuery>;

    title: Maybe<string>;

    dateRange: Maybe<DateRange>;

    savedQueryId: Maybe<string>;

    sort: Maybe<Sort>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;
  };

  export type Columns = {
    __typename?: 'ColumnHeaderResult';

    aggregatable: Maybe<boolean>;

    category: Maybe<string>;

    columnHeaderType: Maybe<string>;

    description: Maybe<string>;

    example: Maybe<string>;

    indexes: Maybe<string[]>;

    id: Maybe<string>;

    name: Maybe<string>;

    searchable: Maybe<boolean>;

    type: Maybe<string>;
  };

  export type DataProviders = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    queryMatch: Maybe<QueryMatch>;

    and: Maybe<And[]>;
  };

  export type QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type And = {
    __typename?: 'DataProviderResult';

    id: Maybe<string>;

    name: Maybe<string>;

    enabled: Maybe<boolean>;

    excluded: Maybe<boolean>;

    kqlQuery: Maybe<string>;

    queryMatch: Maybe<_QueryMatch>;
  };

  export type _QueryMatch = {
    __typename?: 'QueryMatchResult';

    field: Maybe<string>;

    displayField: Maybe<string>;

    value: Maybe<string>;

    displayValue: Maybe<string>;

    operator: Maybe<string>;
  };

  export type Favorite = {
    __typename?: 'FavoriteTimelineResult';

    fullName: Maybe<string>;

    userName: Maybe<string>;

    favoriteDate: Maybe<number>;
  };

  export type Filters = {
    __typename?: 'FilterTimelineResult';

    meta: Maybe<Meta>;

    query: Maybe<string>;

    exists: Maybe<string>;

    match_all: Maybe<string>;

    missing: Maybe<string>;

    range: Maybe<string>;

    script: Maybe<string>;
  };

  export type Meta = {
    __typename?: 'FilterMetaTimelineResult';

    alias: Maybe<string>;

    controlledBy: Maybe<string>;

    disabled: Maybe<boolean>;

    field: Maybe<string>;

    formattedValue: Maybe<string>;

    index: Maybe<string>;

    key: Maybe<string>;

    negate: Maybe<boolean>;

    params: Maybe<string>;

    type: Maybe<string>;

    value: Maybe<string>;
  };

  export type KqlQuery = {
    __typename?: 'SerializedFilterQueryResult';

    filterQuery: Maybe<FilterQuery>;
  };

  export type FilterQuery = {
    __typename?: 'SerializedKueryQueryResult';

    kuery: Maybe<Kuery>;

    serializedQuery: Maybe<string>;
  };

  export type Kuery = {
    __typename?: 'KueryFilterQueryResult';

    kind: Maybe<string>;

    expression: Maybe<string>;
  };

  export type DateRange = {
    __typename?: 'DateRangePickerResult';

    start: Maybe<number>;

    end: Maybe<number>;
  };

  export type Sort = {
    __typename?: 'SortTimelineResult';

    columnId: Maybe<string>;

    sortDirection: Maybe<string>;
  };
}

export namespace PersistTimelinePinnedEventMutation {
  export type Variables = {
    pinnedEventId?: Maybe<string>;
    eventId: string;
    timelineId?: Maybe<string>;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    persistPinnedEventOnTimeline: Maybe<PersistPinnedEventOnTimeline>;
  };

  export type PersistPinnedEventOnTimeline = {
    __typename?: 'PinnedEvent';

    pinnedEventId: string;

    eventId: Maybe<string>;

    timelineId: Maybe<string>;

    timelineVersion: Maybe<string>;

    created: Maybe<number>;

    createdBy: Maybe<string>;

    updated: Maybe<number>;

    updatedBy: Maybe<string>;

    version: Maybe<string>;
  };
}

export namespace GetTlsQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: Maybe<string>;
    flowTarget: FlowTargetSourceDest;
    ip: string;
    pagination: PaginationInputPaginated;
    sort: TlsSortField;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Tls: Tls;
  };

  export type Tls = {
    __typename?: 'TlsData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'TlsEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'TlsNode';

    _id: Maybe<string>;

    alternativeNames: Maybe<string[]>;

    commonNames: Maybe<string[]>;

    ja3: Maybe<string[]>;

    issuerNames: Maybe<string[]>;

    notAfter: Maybe<string[]>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetUncommonProcessesQuery {
  export type Variables = {
    sourceId: string;
    timerange: TimerangeInput;
    pagination: PaginationInputPaginated;
    filterQuery?: Maybe<string>;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    UncommonProcesses: UncommonProcesses;
  };

  export type UncommonProcesses = {
    __typename?: 'UncommonProcessesData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'UncommonProcessesEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'UncommonProcessItem';

    _id: string;

    instances: number;

    process: Process;

    user: Maybe<User>;

    hosts: Hosts[];
  };

  export type Process = {
    __typename?: 'ProcessEcsFields';

    args: Maybe<string[]>;

    name: Maybe<string[]>;
  };

  export type User = {
    __typename?: 'UserEcsFields';

    id: Maybe<string[]>;

    name: Maybe<string[]>;
  };

  export type Hosts = {
    __typename?: 'HostEcsFields';

    name: Maybe<string[]>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace GetUsersQuery {
  export type Variables = {
    sourceId: string;
    filterQuery?: Maybe<string>;
    flowTarget: FlowTarget;
    ip: string;
    pagination: PaginationInputPaginated;
    sort: UsersSortField;
    timerange: TimerangeInput;
    defaultIndex: string[];
    inspect: boolean;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'Source';

    id: string;

    Users: Users;
  };

  export type Users = {
    __typename?: 'UsersData';

    totalCount: number;

    edges: Edges[];

    pageInfo: PageInfo;

    inspect: Maybe<Inspect>;
  };

  export type Edges = {
    __typename?: 'UsersEdges';

    node: Node;

    cursor: Cursor;
  };

  export type Node = {
    __typename?: 'UsersNode';

    user: Maybe<User>;
  };

  export type User = {
    __typename?: 'UsersItem';

    name: Maybe<string>;

    id: Maybe<string[]>;

    groupId: Maybe<string[]>;

    groupName: Maybe<string[]>;

    count: Maybe<number>;
  };

  export type Cursor = {
    __typename?: 'CursorType';

    value: Maybe<string>;
  };

  export type PageInfo = {
    __typename?: 'PageInfoPaginated';

    activePage: number;

    fakeTotalCount: number;

    showMorePagesIndicator: boolean;
  };

  export type Inspect = {
    __typename?: 'Inspect';

    dsl: string[];

    response: string[];
  };
}

export namespace KpiHostDetailsChartFields {
  export type Fragment = {
    __typename?: 'KpiHostHistogramData';

    x: Maybe<number>;

    y: Maybe<number>;
  };
}

export namespace KpiHostChartFields {
  export type Fragment = {
    __typename?: 'KpiHostHistogramData';

    x: Maybe<number>;

    y: Maybe<number>;
  };
}

export namespace KpiNetworkChartFields {
  export type Fragment = {
    __typename?: 'KpiNetworkHistogramData';

    x: Maybe<number>;

    y: Maybe<number>;
  };
}
