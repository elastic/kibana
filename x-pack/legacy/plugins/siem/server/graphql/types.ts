/* tslint:disable */
/* eslint-disable */
/*
     * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
     * or more contributor license agreements. Licensed under the Elastic License;
     * you may not use this file except in compliance with the Elastic License.
     */

import { SiemContext } from '../lib/types';
import { GraphQLResolveInfo } from 'graphql';

export type Resolver<Result, Parent = any, Context = any, Args = never> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

export interface ISubscriptionResolverObject<Result, Parent, Context, Args> {
  subscribe<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): AsyncIterator<R | Result>;
  resolve?<R = Result, P = Parent>(
    parent: P,
    args: Args,
    context: Context,
    info: GraphQLResolveInfo
  ): R | Result | Promise<R | Result>;
}

export type SubscriptionResolver<Result, Parent = any, Context = any, Args = never> =
  | ((...args: any[]) => ISubscriptionResolverObject<Result, Parent, Context, Args>)
  | ISubscriptionResolverObject<Result, Parent, Context, Args>;

// ====================================================
// START: Typescript template
// ====================================================

// ====================================================
// Scalars
// ====================================================

export type ToStringArray = string[] | string;

export type Date = string;

export type ToNumberArray = number[] | number;

export type ToDateArray = string[] | string;

export type ToBooleanArray = boolean[] | boolean;

export type EsValue = any;

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
  eventId?: string | null;

  note?: string | null;

  timelineId?: string | null;

  noteId: string;

  created?: number | null;

  createdBy?: string | null;

  timelineVersion?: string | null;

  updated?: number | null;

  updatedBy?: string | null;

  version?: string | null;
}

export interface ResponseNotes {
  notes: NoteResult[];

  totalCount?: number | null;
}

export interface PinnedEvent {
  pinnedEventId: string;

  eventId?: string | null;

  timelineId?: string | null;

  timelineVersion?: string | null;

  created?: number | null;

  createdBy?: string | null;

  updated?: number | null;

  updatedBy?: string | null;

  version?: string | null;
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
  /** Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Events: EventsData;

  Timeline: TimelineData;

  TimelineDetails: TimelineDetailsData;

  LastEventTime: LastEventTimeData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  Hosts: HostsData;

  HostOverview: HostItem;

  HostFirstLastSeen: FirstLastSeenHost;

  IpOverview?: IpOverviewData | null;

  Domains: DomainsData;

  Tls: TlsData;

  Users: UsersData;

  KpiNetwork?: KpiNetworkData | null;

  KpiHosts: KpiHostsData;

  KpiHostDetails: KpiHostDetailsData;
  /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
  NetworkTopNFlow: NetworkTopNFlowData;

  NetworkDns: NetworkDnsData;

  OverviewNetwork?: OverviewNetworkData | null;

  OverviewHost?: OverviewHostData | null;
  /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
  UncommonProcesses: UncommonProcessesData;
  /** Just a simple example to get the app name */
  whoAmI?: SayMyName | null;
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
  example?: string | null;
  /** whether the field's belong to an alias index */
  indexes: (string | null)[];
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
  /** Description of the field */
  description?: string | null;
}

export interface AuthenticationsData {
  edges: AuthenticationsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
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

  lastSuccess?: LastSourceHost | null;

  lastFailure?: LastSourceHost | null;
}

export interface UserEcsFields {
  id?: ToStringArray | null;

  name?: ToStringArray | null;

  full_name?: ToStringArray | null;

  email?: ToStringArray | null;

  hash?: ToStringArray | null;

  group?: ToStringArray | null;
}

export interface LastSourceHost {
  timestamp?: Date | null;

  source?: SourceEcsFields | null;

  host?: HostEcsFields | null;
}

export interface SourceEcsFields {
  bytes?: ToNumberArray | null;

  ip?: ToStringArray | null;

  port?: ToNumberArray | null;

  domain?: ToStringArray | null;

  geo?: GeoEcsFields | null;

  packets?: ToNumberArray | null;
}

export interface GeoEcsFields {
  city_name?: ToStringArray | null;

  continent_name?: ToStringArray | null;

  country_iso_code?: ToStringArray | null;

  country_name?: ToStringArray | null;

  location?: Location | null;

  region_iso_code?: ToStringArray | null;

  region_name?: ToStringArray | null;
}

export interface Location {
  lon?: ToNumberArray | null;

  lat?: ToNumberArray | null;
}

export interface HostEcsFields {
  architecture?: ToStringArray | null;

  id?: ToStringArray | null;

  ip?: ToStringArray | null;

  mac?: ToStringArray | null;

  name?: ToStringArray | null;

  os?: OsEcsFields | null;

  type?: ToStringArray | null;
}

export interface OsEcsFields {
  platform?: ToStringArray | null;

  name?: ToStringArray | null;

  full?: ToStringArray | null;

  family?: ToStringArray | null;

  version?: ToStringArray | null;

  kernel?: ToStringArray | null;
}

export interface CursorType {
  value?: string | null;

  tiebreaker?: string | null;
}

export interface PageInfo {
  endCursor?: CursorType | null;

  hasNextPage?: boolean | null;
}

export interface Inspect {
  dsl: string[];

  response: string[];
}

export interface EventsData {
  edges: EcsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface EcsEdges {
  node: Ecs;

  cursor: CursorType;
}

export interface Ecs {
  _id: string;

  _index?: string | null;

  auditd?: AuditdEcsFields | null;

  destination?: DestinationEcsFields | null;

  event?: EventEcsFields | null;

  geo?: GeoEcsFields | null;

  host?: HostEcsFields | null;

  network?: NetworkEcsField | null;

  source?: SourceEcsFields | null;

  suricata?: SuricataEcsFields | null;

  tls?: TlsEcsFields | null;

  zeek?: ZeekEcsFields | null;

  http?: HttpEcsFields | null;

  url?: UrlEcsFields | null;

  timestamp?: Date | null;

  message?: ToStringArray | null;

  user?: UserEcsFields | null;

  process?: ProcessEcsFields | null;

  file?: FileFields | null;

  system?: SystemEcsField | null;
}

export interface AuditdEcsFields {
  result?: ToStringArray | null;

  session?: ToStringArray | null;

  data?: AuditdData | null;

  summary?: Summary | null;

  sequence?: ToStringArray | null;
}

export interface AuditdData {
  acct?: ToStringArray | null;

  terminal?: ToStringArray | null;

  op?: ToStringArray | null;
}

export interface Summary {
  actor?: PrimarySecondary | null;

  object?: PrimarySecondary | null;

  how?: ToStringArray | null;

  message_type?: ToStringArray | null;

  sequence?: ToStringArray | null;
}

export interface PrimarySecondary {
  primary?: ToStringArray | null;

  secondary?: ToStringArray | null;

  type?: ToStringArray | null;
}

export interface DestinationEcsFields {
  bytes?: ToNumberArray | null;

  ip?: ToStringArray | null;

  port?: ToNumberArray | null;

  domain?: ToStringArray | null;

  geo?: GeoEcsFields | null;

  packets?: ToNumberArray | null;
}

export interface EventEcsFields {
  action?: ToStringArray | null;

  category?: ToStringArray | null;

  created?: ToDateArray | null;

  dataset?: ToStringArray | null;

  duration?: ToNumberArray | null;

  end?: ToDateArray | null;

  hash?: ToStringArray | null;

  id?: ToStringArray | null;

  kind?: ToStringArray | null;

  module?: ToStringArray | null;

  original?: ToStringArray | null;

  outcome?: ToStringArray | null;

  risk_score?: ToNumberArray | null;

  risk_score_norm?: ToNumberArray | null;

  severity?: ToNumberArray | null;

  start?: ToDateArray | null;

  timezone?: ToStringArray | null;

  type?: ToStringArray | null;
}

export interface NetworkEcsField {
  bytes?: ToNumberArray | null;

  community_id?: ToStringArray | null;

  direction?: ToStringArray | null;

  packets?: ToNumberArray | null;

  protocol?: ToStringArray | null;

  transport?: ToStringArray | null;
}

export interface SuricataEcsFields {
  eve?: SuricataEveData | null;
}

export interface SuricataEveData {
  alert?: SuricataAlertData | null;

  flow_id?: ToNumberArray | null;

  proto?: ToStringArray | null;
}

export interface SuricataAlertData {
  signature?: ToStringArray | null;

  signature_id?: ToNumberArray | null;
}

export interface TlsEcsFields {
  client_certificate?: TlsClientCertificateData | null;

  fingerprints?: TlsFingerprintsData | null;

  server_certificate?: TlsServerCertificateData | null;
}

export interface TlsClientCertificateData {
  fingerprint?: FingerprintData | null;
}

export interface FingerprintData {
  sha1?: ToStringArray | null;
}

export interface TlsFingerprintsData {
  ja3?: TlsJa3Data | null;
}

export interface TlsJa3Data {
  hash?: ToStringArray | null;
}

export interface TlsServerCertificateData {
  fingerprint?: FingerprintData | null;
}

export interface ZeekEcsFields {
  session_id?: ToStringArray | null;

  connection?: ZeekConnectionData | null;

  notice?: ZeekNoticeData | null;

  dns?: ZeekDnsData | null;

  http?: ZeekHttpData | null;

  files?: ZeekFileData | null;

  ssl?: ZeekSslData | null;
}

export interface ZeekConnectionData {
  local_resp?: ToBooleanArray | null;

  local_orig?: ToBooleanArray | null;

  missed_bytes?: ToNumberArray | null;

  state?: ToStringArray | null;

  history?: ToStringArray | null;
}

export interface ZeekNoticeData {
  suppress_for?: ToNumberArray | null;

  msg?: ToStringArray | null;

  note?: ToStringArray | null;

  sub?: ToStringArray | null;

  dst?: ToStringArray | null;

  dropped?: ToBooleanArray | null;

  peer_descr?: ToStringArray | null;
}

export interface ZeekDnsData {
  AA?: ToBooleanArray | null;

  qclass_name?: ToStringArray | null;

  RD?: ToBooleanArray | null;

  qtype_name?: ToStringArray | null;

  rejected?: ToBooleanArray | null;

  qtype?: ToStringArray | null;

  query?: ToStringArray | null;

  trans_id?: ToNumberArray | null;

  qclass?: ToStringArray | null;

  RA?: ToBooleanArray | null;

  TC?: ToBooleanArray | null;
}

export interface ZeekHttpData {
  resp_mime_types?: ToStringArray | null;

  trans_depth?: ToStringArray | null;

  status_msg?: ToStringArray | null;

  resp_fuids?: ToStringArray | null;

  tags?: ToStringArray | null;
}

export interface ZeekFileData {
  session_ids?: ToStringArray | null;

  timedout?: ToBooleanArray | null;

  local_orig?: ToBooleanArray | null;

  tx_host?: ToStringArray | null;

  source?: ToStringArray | null;

  is_orig?: ToBooleanArray | null;

  overflow_bytes?: ToNumberArray | null;

  sha1?: ToStringArray | null;

  duration?: ToNumberArray | null;

  depth?: ToNumberArray | null;

  analyzers?: ToStringArray | null;

  mime_type?: ToStringArray | null;

  rx_host?: ToStringArray | null;

  total_bytes?: ToNumberArray | null;

  fuid?: ToStringArray | null;

  seen_bytes?: ToNumberArray | null;

  missing_bytes?: ToNumberArray | null;

  md5?: ToStringArray | null;
}

export interface ZeekSslData {
  cipher?: ToStringArray | null;

  established?: ToBooleanArray | null;

  resumed?: ToBooleanArray | null;

  version?: ToStringArray | null;
}

export interface HttpEcsFields {
  version?: ToStringArray | null;

  request?: HttpRequestData | null;

  response?: HttpResponseData | null;
}

export interface HttpRequestData {
  method?: ToStringArray | null;

  body?: HttpBodyData | null;

  referrer?: ToStringArray | null;

  bytes?: ToNumberArray | null;
}

export interface HttpBodyData {
  content?: ToStringArray | null;

  bytes?: ToNumberArray | null;
}

export interface HttpResponseData {
  status_code?: ToNumberArray | null;

  body?: HttpBodyData | null;

  bytes?: ToNumberArray | null;
}

export interface UrlEcsFields {
  domain?: ToStringArray | null;

  original?: ToStringArray | null;

  username?: ToStringArray | null;

  password?: ToStringArray | null;
}

export interface ProcessEcsFields {
  pid?: ToNumberArray | null;

  name?: ToStringArray | null;

  ppid?: ToNumberArray | null;

  args?: ToStringArray | null;

  executable?: ToStringArray | null;

  title?: ToStringArray | null;

  thread?: Thread | null;

  working_directory?: ToStringArray | null;
}

export interface Thread {
  id?: ToNumberArray | null;

  start?: ToStringArray | null;
}

export interface FileFields {
  path?: ToStringArray | null;

  target_path?: ToStringArray | null;

  extension?: ToStringArray | null;

  type?: ToStringArray | null;

  device?: ToStringArray | null;

  inode?: ToStringArray | null;

  uid?: ToStringArray | null;

  owner?: ToStringArray | null;

  gid?: ToStringArray | null;

  group?: ToStringArray | null;

  mode?: ToStringArray | null;

  size?: ToNumberArray | null;

  mtime?: ToDateArray | null;

  ctime?: ToDateArray | null;
}

export interface SystemEcsField {
  audit?: AuditEcsFields | null;

  auth?: AuthEcsFields | null;
}

export interface AuditEcsFields {
  package?: PackageEcsFields | null;
}

export interface PackageEcsFields {
  arch?: ToStringArray | null;

  entity_id?: ToStringArray | null;

  name?: ToStringArray | null;

  size?: ToNumberArray | null;

  summary?: ToStringArray | null;

  version?: ToStringArray | null;
}

export interface AuthEcsFields {
  ssh?: SshEcsFields | null;
}

export interface SshEcsFields {
  method?: ToStringArray | null;

  signature?: ToStringArray | null;
}

export interface TimelineData {
  edges: TimelineEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface TimelineEdges {
  node: TimelineItem;

  cursor: CursorType;
}

export interface TimelineItem {
  _id: string;

  _index?: string | null;

  data: TimelineNonEcsData[];

  ecs: Ecs;
}

export interface TimelineNonEcsData {
  field: string;

  value?: ToStringArray | null;
}

export interface TimelineDetailsData {
  data?: DetailItem[] | null;

  inspect?: Inspect | null;
}

export interface DetailItem {
  category: string;

  description?: string | null;

  example?: string | null;

  field: string;

  type: string;

  values?: ToStringArray | null;

  originalValue?: EsValue | null;
}

export interface LastEventTimeData {
  lastSeen?: Date | null;

  inspect?: Inspect | null;
}

export interface HostsData {
  edges: HostsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface HostsEdges {
  node: HostItem;

  cursor: CursorType;
}

export interface HostItem {
  _id?: string | null;

  lastSeen?: Date | null;

  host?: HostEcsFields | null;

  cloud?: CloudFields | null;

  inspect?: Inspect | null;
}

export interface CloudFields {
  instance?: CloudInstance | null;

  machine?: CloudMachine | null;

  provider?: (string | null)[] | null;

  region?: (string | null)[] | null;
}

export interface CloudInstance {
  id?: (string | null)[] | null;
}

export interface CloudMachine {
  type?: (string | null)[] | null;
}

export interface FirstLastSeenHost {
  inspect?: Inspect | null;

  firstSeen?: Date | null;

  lastSeen?: Date | null;
}

export interface IpOverviewData {
  client?: Overview | null;

  destination?: Overview | null;

  host: HostEcsFields;

  server?: Overview | null;

  source?: Overview | null;

  inspect?: Inspect | null;
}

export interface Overview {
  firstSeen?: Date | null;

  lastSeen?: Date | null;

  autonomousSystem: AutonomousSystem;

  geo: GeoEcsFields;
}

export interface AutonomousSystem {
  as_org?: string | null;

  asn?: string | null;

  ip?: string | null;
}

export interface DomainsData {
  edges: DomainsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface DomainsEdges {
  node: DomainsNode;

  cursor: CursorType;
}

export interface DomainsNode {
  _id?: string | null;

  timestamp?: Date | null;

  source?: DomainsItem | null;

  destination?: DomainsItem | null;

  client?: DomainsItem | null;

  server?: DomainsItem | null;

  network?: DomainsNetworkField | null;
}

export interface DomainsItem {
  uniqueIpCount?: number | null;

  domainName?: string | null;

  firstSeen?: Date | null;

  lastSeen?: Date | null;
}

export interface DomainsNetworkField {
  bytes?: number | null;

  packets?: number | null;

  transport?: string | null;

  direction?: NetworkDirectionEcs[] | null;
}

export interface TlsData {
  edges: TlsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface TlsEdges {
  node: TlsNode;

  cursor: CursorType;
}

export interface TlsNode {
  _id?: string | null;

  timestamp?: Date | null;

  alternativeNames?: string[] | null;

  notAfter?: string[] | null;

  commonNames?: string[] | null;

  ja3?: string[] | null;

  issuerNames?: string[] | null;
}

export interface UsersData {
  edges: UsersEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface UsersEdges {
  node: UsersNode;

  cursor: CursorType;
}

export interface UsersNode {
  _id?: string | null;

  timestamp?: Date | null;

  user?: UsersItem | null;
}

export interface UsersItem {
  name?: string | null;

  id?: ToStringArray | null;

  groupId?: ToStringArray | null;

  groupName?: ToStringArray | null;

  count?: number | null;
}

export interface KpiNetworkData {
  networkEvents?: number | null;

  uniqueFlowId?: number | null;

  uniqueSourcePrivateIps?: number | null;

  uniqueSourcePrivateIpsHistogram?: KpiNetworkHistogramData[] | null;

  uniqueDestinationPrivateIps?: number | null;

  uniqueDestinationPrivateIpsHistogram?: KpiNetworkHistogramData[] | null;

  dnsQueries?: number | null;

  tlsHandshakes?: number | null;

  inspect?: Inspect | null;
}

export interface KpiNetworkHistogramData {
  x?: number | null;

  y?: number | null;
}

export interface KpiHostsData {
  hosts?: number | null;

  hostsHistogram?: KpiHostHistogramData[] | null;

  authSuccess?: number | null;

  authSuccessHistogram?: KpiHostHistogramData[] | null;

  authFailure?: number | null;

  authFailureHistogram?: KpiHostHistogramData[] | null;

  uniqueSourceIps?: number | null;

  uniqueSourceIpsHistogram?: KpiHostHistogramData[] | null;

  uniqueDestinationIps?: number | null;

  uniqueDestinationIpsHistogram?: KpiHostHistogramData[] | null;

  inspect?: Inspect | null;
}

export interface KpiHostHistogramData {
  x?: number | null;

  y?: number | null;
}

export interface KpiHostDetailsData {
  authSuccess?: number | null;

  authSuccessHistogram?: KpiHostHistogramData[] | null;

  authFailure?: number | null;

  authFailureHistogram?: KpiHostHistogramData[] | null;

  uniqueSourceIps?: number | null;

  uniqueSourceIpsHistogram?: KpiHostHistogramData[] | null;

  uniqueDestinationIps?: number | null;

  uniqueDestinationIpsHistogram?: KpiHostHistogramData[] | null;

  inspect?: Inspect | null;
}

export interface NetworkTopNFlowData {
  edges: NetworkTopNFlowEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface NetworkTopNFlowEdges {
  node: NetworkTopNFlowItem;

  cursor: CursorType;
}

export interface NetworkTopNFlowItem {
  _id?: string | null;

  source?: TopNFlowItem | null;

  destination?: TopNFlowItem | null;

  client?: TopNFlowItem | null;

  server?: TopNFlowItem | null;

  network?: TopNFlowNetworkEcsField | null;
}

export interface TopNFlowItem {
  count?: number | null;

  domain?: string[] | null;

  ip?: string | null;
}

export interface TopNFlowNetworkEcsField {
  bytes?: number | null;

  packets?: number | null;

  transport?: string | null;

  direction?: NetworkDirectionEcs[] | null;
}

export interface NetworkDnsData {
  edges: NetworkDnsEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
}

export interface NetworkDnsEdges {
  node: NetworkDnsItem;

  cursor: CursorType;
}

export interface NetworkDnsItem {
  _id?: string | null;

  dnsBytesIn?: number | null;

  dnsBytesOut?: number | null;

  dnsName?: string | null;

  queryCount?: number | null;

  uniqueDomains?: number | null;
}

export interface OverviewNetworkData {
  auditbeatSocket?: number | null;

  filebeatCisco?: number | null;

  filebeatNetflow?: number | null;

  filebeatPanw?: number | null;

  filebeatSuricata?: number | null;

  filebeatZeek?: number | null;

  packetbeatDNS?: number | null;

  packetbeatFlow?: number | null;

  packetbeatTLS?: number | null;

  inspect?: Inspect | null;
}

export interface OverviewHostData {
  auditbeatAuditd?: number | null;

  auditbeatFIM?: number | null;

  auditbeatLogin?: number | null;

  auditbeatPackage?: number | null;

  auditbeatProcess?: number | null;

  auditbeatUser?: number | null;

  filebeatSystemModule?: number | null;

  winlogbeat?: number | null;

  inspect?: Inspect | null;
}

export interface UncommonProcessesData {
  edges: UncommonProcessesEdges[];

  totalCount: number;

  pageInfo: PageInfo;

  inspect?: Inspect | null;
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

  user?: UserEcsFields | null;
}

export interface SayMyName {
  /** The id of the source */
  appName: string;
}

export interface TimelineResult {
  savedObjectId: string;

  columns?: ColumnHeaderResult[] | null;

  dataProviders?: DataProviderResult[] | null;

  dateRange?: DateRangePickerResult | null;

  description?: string | null;

  eventIdToNoteIds?: NoteResult[] | null;

  favorite?: FavoriteTimelineResult[] | null;

  kqlMode?: string | null;

  kqlQuery?: SerializedFilterQueryResult | null;

  notes?: NoteResult[] | null;

  noteIds?: string[] | null;

  pinnedEventIds?: string[] | null;

  pinnedEventsSaveObject?: PinnedEvent[] | null;

  title?: string | null;

  sort?: SortTimelineResult | null;

  created?: number | null;

  createdBy?: string | null;

  updated?: number | null;

  updatedBy?: string | null;

  version: string;
}

export interface ColumnHeaderResult {
  aggregatable?: boolean | null;

  category?: string | null;

  columnHeaderType?: string | null;

  description?: string | null;

  example?: string | null;

  indexes?: string[] | null;

  id?: string | null;

  name?: string | null;

  placeholder?: string | null;

  searchable?: boolean | null;

  type?: string | null;
}

export interface DataProviderResult {
  id?: string | null;

  name?: string | null;

  enabled?: boolean | null;

  excluded?: boolean | null;

  kqlQuery?: string | null;

  queryMatch?: QueryMatchResult | null;

  and?: DataProviderResult[] | null;
}

export interface QueryMatchResult {
  field?: string | null;

  displayField?: string | null;

  value?: string | null;

  displayValue?: string | null;

  operator?: string | null;
}

export interface DateRangePickerResult {
  start?: number | null;

  end?: number | null;
}

export interface FavoriteTimelineResult {
  fullName?: string | null;

  userName?: string | null;

  favoriteDate?: number | null;
}

export interface SerializedFilterQueryResult {
  filterQuery?: SerializedKueryQueryResult | null;
}

export interface SerializedKueryQueryResult {
  kuery?: KueryFilterQueryResult | null;

  serializedQuery?: string | null;
}

export interface KueryFilterQueryResult {
  kind?: string | null;

  expression?: string | null;
}

export interface SortTimelineResult {
  columnId?: string | null;

  sortDirection?: string | null;
}

export interface ResponseTimelines {
  timeline: (TimelineResult | null)[];

  totalCount?: number | null;
}

export interface Mutation {
  /** Persists a note */
  persistNote: ResponseNote;

  deleteNote?: boolean | null;

  deleteNoteByTimelineId?: boolean | null;
  /** Persists a pinned event in a timeline */
  persistPinnedEventOnTimeline?: PinnedEvent | null;
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
  code?: number | null;

  message?: string | null;

  note: NoteResult;
}

export interface ResponseTimeline {
  code?: number | null;

  message?: string | null;

  timeline: TimelineResult;
}

export interface ResponseFavoriteTimeline {
  savedObjectId: string;

  version: string;

  favorite?: FavoriteTimelineResult[] | null;
}

export interface OsFields {
  platform?: string | null;

  name?: string | null;

  full?: string | null;

  family?: string | null;

  version?: string | null;

  kernel?: string | null;
}

export interface HostFields {
  architecture?: string | null;

  id?: string | null;

  ip?: (string | null)[] | null;

  mac?: (string | null)[] | null;

  name?: string | null;

  os?: OsFields | null;

  type?: string | null;
}

// ====================================================
// InputTypes
// ====================================================

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

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: string | null;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: string | null;
}

export interface SortField {
  sortFieldId: string;

  direction: Direction;
}

export interface LastTimeDetails {
  hostName?: string | null;

  ip?: string | null;
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
  eventId?: string | null;

  note?: string | null;

  timelineId?: string | null;
}

export interface TimelineInput {
  columns?: ColumnHeaderInput[] | null;

  dataProviders?: DataProviderInput[] | null;

  description?: string | null;

  kqlMode?: string | null;

  kqlQuery?: SerializedFilterQueryInput | null;

  title?: string | null;

  dateRange?: DateRangePickerInput | null;

  sort?: SortTimelineInput | null;
}

export interface ColumnHeaderInput {
  aggregatable?: boolean | null;

  category?: string | null;

  columnHeaderType?: string | null;

  description?: string | null;

  example?: string | null;

  indexes?: string[] | null;

  id?: string | null;

  name?: string | null;

  placeholder?: string | null;

  searchable?: boolean | null;

  type?: string | null;
}

export interface DataProviderInput {
  id?: string | null;

  name?: string | null;

  enabled?: boolean | null;

  excluded?: boolean | null;

  kqlQuery?: string | null;

  queryMatch?: QueryMatchInput | null;

  and?: DataProviderInput[] | null;
}

export interface QueryMatchInput {
  field?: string | null;

  displayField?: string | null;

  value?: string | null;

  displayValue?: string | null;

  operator?: string | null;
}

export interface SerializedFilterQueryInput {
  filterQuery?: SerializedKueryQueryInput | null;
}

export interface SerializedKueryQueryInput {
  kuery?: KueryFilterQueryInput | null;

  serializedQuery?: string | null;
}

export interface KueryFilterQueryInput {
  kind?: string | null;

  expression?: string | null;
}

export interface DateRangePickerInput {
  start?: number | null;

  end?: number | null;
}

export interface SortTimelineInput {
  columnId?: string | null;

  sortDirection?: string | null;
}

export interface FavoriteTimelineInput {
  fullName?: string | null;

  userName?: string | null;

  favoriteDate?: number | null;
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
  pageInfo?: PageInfoNote | null;

  search?: string | null;

  sort?: SortNote | null;
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
  pageInfo?: PageInfoTimeline | null;

  search?: string | null;

  sort?: SortTimeline | null;

  onlyUserFavorite?: boolean | null;
}
export interface AuthenticationsSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface EventsSourceArgs {
  pagination: PaginationInput;

  sortField: SortField;

  timerange?: TimerangeInput | null;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface TimelineSourceArgs {
  pagination: PaginationInput;

  sortField: SortField;

  fieldRequested: string[];

  timerange?: TimerangeInput | null;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface TimelineDetailsSourceArgs {
  eventId: string;

  indexName: string;

  defaultIndex: string[];
}
export interface LastEventTimeSourceArgs {
  id?: string | null;

  indexKey: LastEventIndexKey;

  details: LastTimeDetails;

  defaultIndex: string[];
}
export interface HostsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  pagination: PaginationInput;

  sort: HostsSortField;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface HostOverviewSourceArgs {
  id?: string | null;

  hostName: string;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface HostFirstLastSeenSourceArgs {
  id?: string | null;

  hostName: string;

  defaultIndex: string[];
}
export interface IpOverviewSourceArgs {
  id?: string | null;

  filterQuery?: string | null;

  ip: string;

  defaultIndex: string[];
}
export interface DomainsSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  ip: string;

  pagination: PaginationInput;

  sort: DomainsSortField;

  flowDirection: FlowDirection;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface TlsSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  ip: string;

  pagination: PaginationInput;

  sort: TlsSortField;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface UsersSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  ip: string;

  pagination: PaginationInput;

  sort: UsersSortField;

  flowTarget: FlowTarget;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface KpiNetworkSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface KpiHostsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface KpiHostDetailsSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface NetworkTopNFlowSourceArgs {
  id?: string | null;

  filterQuery?: string | null;

  flowDirection: FlowDirection;

  flowTarget: FlowTarget;

  pagination: PaginationInput;

  sort: NetworkTopNFlowSortField;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface NetworkDnsSourceArgs {
  filterQuery?: string | null;

  id?: string | null;

  isPtrIncluded: boolean;

  pagination: PaginationInput;

  sort: NetworkDnsSortField;

  timerange: TimerangeInput;

  defaultIndex: string[];
}
export interface OverviewNetworkSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface OverviewHostSourceArgs {
  id?: string | null;

  timerange: TimerangeInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface UncommonProcessesSourceArgs {
  timerange: TimerangeInput;

  pagination: PaginationInput;

  filterQuery?: string | null;

  defaultIndex: string[];
}
export interface IndicesExistSourceStatusArgs {
  defaultIndex: string[];
}
export interface IndexFieldsSourceStatusArgs {
  defaultIndex: string[];
}
export interface PersistNoteMutationArgs {
  noteId?: string | null;

  version?: string | null;

  note: NoteInput;
}
export interface DeleteNoteMutationArgs {
  id: string[];
}
export interface DeleteNoteByTimelineIdMutationArgs {
  timelineId: string;

  version?: string | null;
}
export interface PersistPinnedEventOnTimelineMutationArgs {
  pinnedEventId?: string | null;

  eventId: string;

  timelineId?: string | null;
}
export interface DeletePinnedEventOnTimelineMutationArgs {
  id: string[];
}
export interface DeleteAllPinnedEventsOnTimelineMutationArgs {
  timelineId: string;
}
export interface PersistTimelineMutationArgs {
  id?: string | null;

  version?: string | null;

  timeline: TimelineInput;
}
export interface PersistFavoriteMutationArgs {
  timelineId?: string | null;
}
export interface DeleteTimelineMutationArgs {
  id: string[];
}

// ====================================================
// Enums
// ====================================================

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

export enum NetworkTopNFlowFields {
  bytes = 'bytes',
  packets = 'packets',
  ipCount = 'ipCount',
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

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Resolvers
// ====================================================

export namespace QueryResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = never> {
    getNote?: GetNoteResolver<NoteResult, TypeParent, Context>;

    getNotesByTimelineId?: GetNotesByTimelineIdResolver<NoteResult[], TypeParent, Context>;

    getNotesByEventId?: GetNotesByEventIdResolver<NoteResult[], TypeParent, Context>;

    getAllNotes?: GetAllNotesResolver<ResponseNotes, TypeParent, Context>;

    getAllPinnedEventsByTimelineId?: GetAllPinnedEventsByTimelineIdResolver<
      PinnedEvent[],
      TypeParent,
      Context
    >;
    /** Get a security data source by id */
    source?: SourceResolver<Source, TypeParent, Context>;
    /** Get a list of all security data sources */
    allSources?: AllSourcesResolver<Source[], TypeParent, Context>;

    getOneTimeline?: GetOneTimelineResolver<TimelineResult, TypeParent, Context>;

    getAllTimeline?: GetAllTimelineResolver<ResponseTimelines, TypeParent, Context>;
  }

  export type GetNoteResolver<R = NoteResult, Parent = never, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    GetNoteArgs
  >;
  export interface GetNoteArgs {
    id: string;
  }

  export type GetNotesByTimelineIdResolver<
    R = NoteResult[],
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, GetNotesByTimelineIdArgs>;
  export interface GetNotesByTimelineIdArgs {
    timelineId: string;
  }

  export type GetNotesByEventIdResolver<
    R = NoteResult[],
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, GetNotesByEventIdArgs>;
  export interface GetNotesByEventIdArgs {
    eventId: string;
  }

  export type GetAllNotesResolver<
    R = ResponseNotes,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, GetAllNotesArgs>;
  export interface GetAllNotesArgs {
    pageInfo?: PageInfoNote | null;

    search?: string | null;

    sort?: SortNote | null;
  }

  export type GetAllPinnedEventsByTimelineIdResolver<
    R = PinnedEvent[],
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, GetAllPinnedEventsByTimelineIdArgs>;
  export interface GetAllPinnedEventsByTimelineIdArgs {
    timelineId: string;
  }

  export type SourceResolver<R = Source, Parent = never, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    /** The id of the source */
    id: string;
  }

  export type AllSourcesResolver<R = Source[], Parent = never, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type GetOneTimelineResolver<
    R = TimelineResult,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, GetOneTimelineArgs>;
  export interface GetOneTimelineArgs {
    id: string;
  }

  export type GetAllTimelineResolver<
    R = ResponseTimelines,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, GetAllTimelineArgs>;
  export interface GetAllTimelineArgs {
    pageInfo?: PageInfoTimeline | null;

    search?: string | null;

    sort?: SortTimeline | null;

    onlyUserFavorite?: boolean | null;
  }
}

export namespace NoteResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NoteResult> {
    eventId?: EventIdResolver<string | null, TypeParent, Context>;

    note?: NoteResolver<string | null, TypeParent, Context>;

    timelineId?: TimelineIdResolver<string | null, TypeParent, Context>;

    noteId?: NoteIdResolver<string, TypeParent, Context>;

    created?: CreatedResolver<number | null, TypeParent, Context>;

    createdBy?: CreatedByResolver<string | null, TypeParent, Context>;

    timelineVersion?: TimelineVersionResolver<string | null, TypeParent, Context>;

    updated?: UpdatedResolver<number | null, TypeParent, Context>;

    updatedBy?: UpdatedByResolver<string | null, TypeParent, Context>;

    version?: VersionResolver<string | null, TypeParent, Context>;
  }

  export type EventIdResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoteResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimelineIdResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoteIdResolver<R = string, Parent = NoteResult, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CreatedResolver<
    R = number | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CreatedByResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimelineVersionResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedResolver<
    R = number | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedByResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = NoteResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ResponseNotesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ResponseNotes> {
    notes?: NotesResolver<NoteResult[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number | null, TypeParent, Context>;
  }

  export type NotesResolver<
    R = NoteResult[],
    Parent = ResponseNotes,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number | null,
    Parent = ResponseNotes,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace PinnedEventResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = PinnedEvent> {
    pinnedEventId?: PinnedEventIdResolver<string, TypeParent, Context>;

    eventId?: EventIdResolver<string | null, TypeParent, Context>;

    timelineId?: TimelineIdResolver<string | null, TypeParent, Context>;

    timelineVersion?: TimelineVersionResolver<string | null, TypeParent, Context>;

    created?: CreatedResolver<number | null, TypeParent, Context>;

    createdBy?: CreatedByResolver<string | null, TypeParent, Context>;

    updated?: UpdatedResolver<number | null, TypeParent, Context>;

    updatedBy?: UpdatedByResolver<string | null, TypeParent, Context>;

    version?: VersionResolver<string | null, TypeParent, Context>;
  }

  export type PinnedEventIdResolver<
    R = string,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EventIdResolver<
    R = string | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimelineIdResolver<
    R = string | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimelineVersionResolver<
    R = string | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CreatedResolver<
    R = number | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CreatedByResolver<
    R = string | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedResolver<
    R = number | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedByResolver<
    R = string | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = PinnedEvent,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SourceResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Source> {
    /** The id of the source */
    id?: IdResolver<string, TypeParent, Context>;
    /** The raw configuration of the source */
    configuration?: ConfigurationResolver<SourceConfiguration, TypeParent, Context>;
    /** The status of the source */
    status?: StatusResolver<SourceStatus, TypeParent, Context>;
    /** Gets Authentication success and failures based on a timerange */
    Authentications?: AuthenticationsResolver<AuthenticationsData, TypeParent, Context>;
    /** Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Events?: EventsResolver<EventsData, TypeParent, Context>;

    Timeline?: TimelineResolver<TimelineData, TypeParent, Context>;

    TimelineDetails?: TimelineDetailsResolver<TimelineDetailsData, TypeParent, Context>;

    LastEventTime?: LastEventTimeResolver<LastEventTimeData, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    Hosts?: HostsResolver<HostsData, TypeParent, Context>;

    HostOverview?: HostOverviewResolver<HostItem, TypeParent, Context>;

    HostFirstLastSeen?: HostFirstLastSeenResolver<FirstLastSeenHost, TypeParent, Context>;

    IpOverview?: IpOverviewResolver<IpOverviewData | null, TypeParent, Context>;

    Domains?: DomainsResolver<DomainsData, TypeParent, Context>;

    Tls?: TlsResolver<TlsData, TypeParent, Context>;

    Users?: UsersResolver<UsersData, TypeParent, Context>;

    KpiNetwork?: KpiNetworkResolver<KpiNetworkData | null, TypeParent, Context>;

    KpiHosts?: KpiHostsResolver<KpiHostsData, TypeParent, Context>;

    KpiHostDetails?: KpiHostDetailsResolver<KpiHostDetailsData, TypeParent, Context>;
    /** Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified */
    NetworkTopNFlow?: NetworkTopNFlowResolver<NetworkTopNFlowData, TypeParent, Context>;

    NetworkDns?: NetworkDnsResolver<NetworkDnsData, TypeParent, Context>;

    OverviewNetwork?: OverviewNetworkResolver<OverviewNetworkData | null, TypeParent, Context>;

    OverviewHost?: OverviewHostResolver<OverviewHostData | null, TypeParent, Context>;
    /** Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified */
    UncommonProcesses?: UncommonProcessesResolver<UncommonProcessesData, TypeParent, Context>;
    /** Just a simple example to get the app name */
    whoAmI?: WhoAmIResolver<SayMyName | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ConfigurationResolver<
    R = SourceConfiguration,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<R = SourceStatus, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type AuthenticationsResolver<
    R = AuthenticationsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, AuthenticationsArgs>;
  export interface AuthenticationsArgs {
    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type EventsResolver<R = EventsData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    EventsArgs
  >;
  export interface EventsArgs {
    pagination: PaginationInput;

    sortField: SortField;

    timerange?: TimerangeInput | null;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type TimelineResolver<R = TimelineData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    TimelineArgs
  >;
  export interface TimelineArgs {
    pagination: PaginationInput;

    sortField: SortField;

    fieldRequested: string[];

    timerange?: TimerangeInput | null;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type TimelineDetailsResolver<
    R = TimelineDetailsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, TimelineDetailsArgs>;
  export interface TimelineDetailsArgs {
    eventId: string;

    indexName: string;

    defaultIndex: string[];
  }

  export type LastEventTimeResolver<
    R = LastEventTimeData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, LastEventTimeArgs>;
  export interface LastEventTimeArgs {
    id?: string | null;

    indexKey: LastEventIndexKey;

    details: LastTimeDetails;

    defaultIndex: string[];
  }

  export type HostsResolver<R = HostsData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    HostsArgs
  >;
  export interface HostsArgs {
    id?: string | null;

    timerange: TimerangeInput;

    pagination: PaginationInput;

    sort: HostsSortField;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type HostOverviewResolver<R = HostItem, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    HostOverviewArgs
  >;
  export interface HostOverviewArgs {
    id?: string | null;

    hostName: string;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type HostFirstLastSeenResolver<
    R = FirstLastSeenHost,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, HostFirstLastSeenArgs>;
  export interface HostFirstLastSeenArgs {
    id?: string | null;

    hostName: string;

    defaultIndex: string[];
  }

  export type IpOverviewResolver<
    R = IpOverviewData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, IpOverviewArgs>;
  export interface IpOverviewArgs {
    id?: string | null;

    filterQuery?: string | null;

    ip: string;

    defaultIndex: string[];
  }

  export type DomainsResolver<R = DomainsData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    DomainsArgs
  >;
  export interface DomainsArgs {
    filterQuery?: string | null;

    id?: string | null;

    ip: string;

    pagination: PaginationInput;

    sort: DomainsSortField;

    flowDirection: FlowDirection;

    flowTarget: FlowTarget;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type TlsResolver<R = TlsData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    TlsArgs
  >;
  export interface TlsArgs {
    filterQuery?: string | null;

    id?: string | null;

    ip: string;

    pagination: PaginationInput;

    sort: TlsSortField;

    flowTarget: FlowTarget;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type UsersResolver<R = UsersData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    UsersArgs
  >;
  export interface UsersArgs {
    filterQuery?: string | null;

    id?: string | null;

    ip: string;

    pagination: PaginationInput;

    sort: UsersSortField;

    flowTarget: FlowTarget;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type KpiNetworkResolver<
    R = KpiNetworkData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, KpiNetworkArgs>;
  export interface KpiNetworkArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type KpiHostsResolver<R = KpiHostsData, Parent = Source, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    KpiHostsArgs
  >;
  export interface KpiHostsArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type KpiHostDetailsResolver<
    R = KpiHostDetailsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, KpiHostDetailsArgs>;
  export interface KpiHostDetailsArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type NetworkTopNFlowResolver<
    R = NetworkTopNFlowData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, NetworkTopNFlowArgs>;
  export interface NetworkTopNFlowArgs {
    id?: string | null;

    filterQuery?: string | null;

    flowDirection: FlowDirection;

    flowTarget: FlowTarget;

    pagination: PaginationInput;

    sort: NetworkTopNFlowSortField;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type NetworkDnsResolver<
    R = NetworkDnsData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, NetworkDnsArgs>;
  export interface NetworkDnsArgs {
    filterQuery?: string | null;

    id?: string | null;

    isPtrIncluded: boolean;

    pagination: PaginationInput;

    sort: NetworkDnsSortField;

    timerange: TimerangeInput;

    defaultIndex: string[];
  }

  export type OverviewNetworkResolver<
    R = OverviewNetworkData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, OverviewNetworkArgs>;
  export interface OverviewNetworkArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type OverviewHostResolver<
    R = OverviewHostData | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, OverviewHostArgs>;
  export interface OverviewHostArgs {
    id?: string | null;

    timerange: TimerangeInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type UncommonProcessesResolver<
    R = UncommonProcessesData,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context, UncommonProcessesArgs>;
  export interface UncommonProcessesArgs {
    timerange: TimerangeInput;

    pagination: PaginationInput;

    filterQuery?: string | null;

    defaultIndex: string[];
  }

  export type WhoAmIResolver<
    R = SayMyName | null,
    Parent = Source,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
/** A set of configuration options for a security data source */
export namespace SourceConfigurationResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceConfiguration> {
    /** The field mapping to use for this source */
    fields?: FieldsResolver<SourceFields, TypeParent, Context>;
  }

  export type FieldsResolver<
    R = SourceFields,
    Parent = SourceConfiguration,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace SourceFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceFields> {
    /** The field to identify a container by */
    container?: ContainerResolver<string, TypeParent, Context>;
    /** The fields to identify a host by */
    host?: HostResolver<string, TypeParent, Context>;
    /** The fields that may contain the log event message. The first field found win. */
    message?: MessageResolver<string[], TypeParent, Context>;
    /** The field to identify a pod by */
    pod?: PodResolver<string, TypeParent, Context>;
    /** The field to use as a tiebreaker for log events that have identical timestamps */
    tiebreaker?: TiebreakerResolver<string, TypeParent, Context>;
    /** The field to use as a timestamp for metrics and logs */
    timestamp?: TimestampResolver<string, TypeParent, Context>;
  }

  export type ContainerResolver<
    R = string,
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<R = string, Parent = SourceFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageResolver<
    R = string[],
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PodResolver<R = string, Parent = SourceFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = string,
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string,
    Parent = SourceFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
/** The status of an infrastructure data source */
export namespace SourceStatusResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceStatus> {
    /** Whether the configured alias or wildcard pattern resolve to any auditbeat indices */
    indicesExist?: IndicesExistResolver<boolean, TypeParent, Context>;
    /** The list of fields defined in the index mappings */
    indexFields?: IndexFieldsResolver<IndexField[], TypeParent, Context>;
  }

  export type IndicesExistResolver<
    R = boolean,
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context, IndicesExistArgs>;
  export interface IndicesExistArgs {
    defaultIndex: string[];
  }

  export type IndexFieldsResolver<
    R = IndexField[],
    Parent = SourceStatus,
    Context = SiemContext
  > = Resolver<R, Parent, Context, IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    defaultIndex: string[];
  }
}
/** A descriptor of a field in an index */
export namespace IndexFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = IndexField> {
    /** Where the field belong */
    category?: CategoryResolver<string, TypeParent, Context>;
    /** Example of field's value */
    example?: ExampleResolver<string | null, TypeParent, Context>;
    /** whether the field's belong to an alias index */
    indexes?: IndexesResolver<(string | null)[], TypeParent, Context>;
    /** The name of the field */
    name?: NameResolver<string, TypeParent, Context>;
    /** The type of the field's values as recognized by Kibana */
    type?: TypeResolver<string, TypeParent, Context>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: SearchableResolver<boolean, TypeParent, Context>;
    /** Whether the field's values can be aggregated */
    aggregatable?: AggregatableResolver<boolean, TypeParent, Context>;
    /** Description of the field */
    description?: DescriptionResolver<string | null, TypeParent, Context>;
  }

  export type CategoryResolver<R = string, Parent = IndexField, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ExampleResolver<
    R = string | null,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IndexesResolver<
    R = (string | null)[],
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<R = string, Parent = IndexField, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = IndexField, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SearchableResolver<
    R = boolean,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AggregatableResolver<
    R = boolean,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = IndexField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthenticationsData> {
    edges?: EdgesResolver<AuthenticationsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = AuthenticationsEdges[],
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = AuthenticationsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthenticationsEdges> {
    node?: NodeResolver<AuthenticationItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = AuthenticationItem,
    Parent = AuthenticationsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = AuthenticationsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthenticationItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthenticationItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    failures?: FailuresResolver<number, TypeParent, Context>;

    successes?: SuccessesResolver<number, TypeParent, Context>;

    user?: UserResolver<UserEcsFields, TypeParent, Context>;

    lastSuccess?: LastSuccessResolver<LastSourceHost | null, TypeParent, Context>;

    lastFailure?: LastFailureResolver<LastSourceHost | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = AuthenticationItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FailuresResolver<
    R = number,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SuccessesResolver<
    R = number,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastSuccessResolver<
    R = LastSourceHost | null,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastFailureResolver<
    R = LastSourceHost | null,
    Parent = AuthenticationItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UserEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UserEcsFields> {
    id?: IdResolver<ToStringArray | null, TypeParent, Context>;

    name?: NameResolver<ToStringArray | null, TypeParent, Context>;

    full_name?: FullNameResolver<ToStringArray | null, TypeParent, Context>;

    email?: EmailResolver<ToStringArray | null, TypeParent, Context>;

    hash?: HashResolver<ToStringArray | null, TypeParent, Context>;

    group?: GroupResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = ToStringArray | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = ToStringArray | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FullNameResolver<
    R = ToStringArray | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EmailResolver<
    R = ToStringArray | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HashResolver<
    R = ToStringArray | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GroupResolver<
    R = ToStringArray | null,
    Parent = UserEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace LastSourceHostResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = LastSourceHost> {
    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;
  }

  export type TimestampResolver<
    R = Date | null,
    Parent = LastSourceHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = LastSourceHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = LastSourceHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SourceEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SourceEcsFields> {
    bytes?: BytesResolver<ToNumberArray | null, TypeParent, Context>;

    ip?: IpResolver<ToStringArray | null, TypeParent, Context>;

    port?: PortResolver<ToNumberArray | null, TypeParent, Context>;

    domain?: DomainResolver<ToStringArray | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    packets?: PacketsResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = ToNumberArray | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = ToStringArray | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PortResolver<
    R = ToNumberArray | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = ToStringArray | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<
    R = GeoEcsFields | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = ToNumberArray | null,
    Parent = SourceEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace GeoEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = GeoEcsFields> {
    city_name?: CityNameResolver<ToStringArray | null, TypeParent, Context>;

    continent_name?: ContinentNameResolver<ToStringArray | null, TypeParent, Context>;

    country_iso_code?: CountryIsoCodeResolver<ToStringArray | null, TypeParent, Context>;

    country_name?: CountryNameResolver<ToStringArray | null, TypeParent, Context>;

    location?: LocationResolver<Location | null, TypeParent, Context>;

    region_iso_code?: RegionIsoCodeResolver<ToStringArray | null, TypeParent, Context>;

    region_name?: RegionNameResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type CityNameResolver<
    R = ToStringArray | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ContinentNameResolver<
    R = ToStringArray | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CountryIsoCodeResolver<
    R = ToStringArray | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CountryNameResolver<
    R = ToStringArray | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LocationResolver<
    R = Location | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RegionIsoCodeResolver<
    R = ToStringArray | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RegionNameResolver<
    R = ToStringArray | null,
    Parent = GeoEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace LocationResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Location> {
    lon?: LonResolver<ToNumberArray | null, TypeParent, Context>;

    lat?: LatResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type LonResolver<
    R = ToNumberArray | null,
    Parent = Location,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LatResolver<
    R = ToNumberArray | null,
    Parent = Location,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostEcsFields> {
    architecture?: ArchitectureResolver<ToStringArray | null, TypeParent, Context>;

    id?: IdResolver<ToStringArray | null, TypeParent, Context>;

    ip?: IpResolver<ToStringArray | null, TypeParent, Context>;

    mac?: MacResolver<ToStringArray | null, TypeParent, Context>;

    name?: NameResolver<ToStringArray | null, TypeParent, Context>;

    os?: OsResolver<OsEcsFields | null, TypeParent, Context>;

    type?: TypeResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type ArchitectureResolver<
    R = ToStringArray | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = ToStringArray | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = ToStringArray | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MacResolver<
    R = ToStringArray | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = ToStringArray | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OsResolver<
    R = OsEcsFields | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = ToStringArray | null,
    Parent = HostEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OsEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OsEcsFields> {
    platform?: PlatformResolver<ToStringArray | null, TypeParent, Context>;

    name?: NameResolver<ToStringArray | null, TypeParent, Context>;

    full?: FullResolver<ToStringArray | null, TypeParent, Context>;

    family?: FamilyResolver<ToStringArray | null, TypeParent, Context>;

    version?: VersionResolver<ToStringArray | null, TypeParent, Context>;

    kernel?: KernelResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type PlatformResolver<
    R = ToStringArray | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = ToStringArray | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FullResolver<
    R = ToStringArray | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FamilyResolver<
    R = ToStringArray | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = ToStringArray | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KernelResolver<
    R = ToStringArray | null,
    Parent = OsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace CursorTypeResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = CursorType> {
    value?: ValueResolver<string | null, TypeParent, Context>;

    tiebreaker?: TiebreakerResolver<string | null, TypeParent, Context>;
  }

  export type ValueResolver<
    R = string | null,
    Parent = CursorType,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TiebreakerResolver<
    R = string | null,
    Parent = CursorType,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace PageInfoResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = PageInfo> {
    endCursor?: EndCursorResolver<CursorType | null, TypeParent, Context>;

    hasNextPage?: HasNextPageResolver<boolean | null, TypeParent, Context>;
  }

  export type EndCursorResolver<
    R = CursorType | null,
    Parent = PageInfo,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HasNextPageResolver<
    R = boolean | null,
    Parent = PageInfo,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace InspectResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Inspect> {
    dsl?: DslResolver<string[], TypeParent, Context>;

    response?: ResponseResolver<string[], TypeParent, Context>;
  }

  export type DslResolver<R = string[], Parent = Inspect, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ResponseResolver<R = string[], Parent = Inspect, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EventsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = EventsData> {
    edges?: EdgesResolver<EcsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<R = EcsEdges[], Parent = EventsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TotalCountResolver<R = number, Parent = EventsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PageInfoResolver<R = PageInfo, Parent = EventsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type InspectResolver<
    R = Inspect | null,
    Parent = EventsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace EcsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = EcsEdges> {
    node?: NodeResolver<Ecs, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = Ecs, Parent = EcsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = EcsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace EcsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Ecs> {
    _id?: IdResolver<string, TypeParent, Context>;

    _index?: IndexResolver<string | null, TypeParent, Context>;

    auditd?: AuditdResolver<AuditdEcsFields | null, TypeParent, Context>;

    destination?: DestinationResolver<DestinationEcsFields | null, TypeParent, Context>;

    event?: EventResolver<EventEcsFields | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    network?: NetworkResolver<NetworkEcsField | null, TypeParent, Context>;

    source?: SourceResolver<SourceEcsFields | null, TypeParent, Context>;

    suricata?: SuricataResolver<SuricataEcsFields | null, TypeParent, Context>;

    tls?: TlsResolver<TlsEcsFields | null, TypeParent, Context>;

    zeek?: ZeekResolver<ZeekEcsFields | null, TypeParent, Context>;

    http?: HttpResolver<HttpEcsFields | null, TypeParent, Context>;

    url?: UrlResolver<UrlEcsFields | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    message?: MessageResolver<ToStringArray | null, TypeParent, Context>;

    user?: UserResolver<UserEcsFields | null, TypeParent, Context>;

    process?: ProcessResolver<ProcessEcsFields | null, TypeParent, Context>;

    file?: FileResolver<FileFields | null, TypeParent, Context>;

    system?: SystemResolver<SystemEcsField | null, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<R = string | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type AuditdResolver<
    R = AuditdEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = DestinationEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EventResolver<
    R = EventEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<R = GeoEcsFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NetworkResolver<
    R = NetworkEcsField | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = SourceEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SuricataResolver<
    R = SuricataEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TlsResolver<R = TlsEcsFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ZeekResolver<
    R = ZeekEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HttpResolver<
    R = HttpEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UrlResolver<R = UrlEcsFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<R = Date | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type MessageResolver<
    R = ToStringArray | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProcessResolver<
    R = ProcessEcsFields | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FileResolver<R = FileFields | null, Parent = Ecs, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SystemResolver<
    R = SystemEcsField | null,
    Parent = Ecs,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuditdEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuditdEcsFields> {
    result?: ResultResolver<ToStringArray | null, TypeParent, Context>;

    session?: SessionResolver<ToStringArray | null, TypeParent, Context>;

    data?: DataResolver<AuditdData | null, TypeParent, Context>;

    summary?: SummaryResolver<Summary | null, TypeParent, Context>;

    sequence?: SequenceResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type ResultResolver<
    R = ToStringArray | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SessionResolver<
    R = ToStringArray | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DataResolver<
    R = AuditdData | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SummaryResolver<
    R = Summary | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SequenceResolver<
    R = ToStringArray | null,
    Parent = AuditdEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuditdDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuditdData> {
    acct?: AcctResolver<ToStringArray | null, TypeParent, Context>;

    terminal?: TerminalResolver<ToStringArray | null, TypeParent, Context>;

    op?: OpResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type AcctResolver<
    R = ToStringArray | null,
    Parent = AuditdData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TerminalResolver<
    R = ToStringArray | null,
    Parent = AuditdData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OpResolver<
    R = ToStringArray | null,
    Parent = AuditdData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SummaryResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Summary> {
    actor?: ActorResolver<PrimarySecondary | null, TypeParent, Context>;

    object?: ObjectResolver<PrimarySecondary | null, TypeParent, Context>;

    how?: HowResolver<ToStringArray | null, TypeParent, Context>;

    message_type?: MessageTypeResolver<ToStringArray | null, TypeParent, Context>;

    sequence?: SequenceResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type ActorResolver<
    R = PrimarySecondary | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ObjectResolver<
    R = PrimarySecondary | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HowResolver<
    R = ToStringArray | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MessageTypeResolver<
    R = ToStringArray | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SequenceResolver<
    R = ToStringArray | null,
    Parent = Summary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace PrimarySecondaryResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = PrimarySecondary> {
    primary?: PrimaryResolver<ToStringArray | null, TypeParent, Context>;

    secondary?: SecondaryResolver<ToStringArray | null, TypeParent, Context>;

    type?: TypeResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type PrimaryResolver<
    R = ToStringArray | null,
    Parent = PrimarySecondary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SecondaryResolver<
    R = ToStringArray | null,
    Parent = PrimarySecondary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = ToStringArray | null,
    Parent = PrimarySecondary,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DestinationEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DestinationEcsFields> {
    bytes?: BytesResolver<ToNumberArray | null, TypeParent, Context>;

    ip?: IpResolver<ToStringArray | null, TypeParent, Context>;

    port?: PortResolver<ToNumberArray | null, TypeParent, Context>;

    domain?: DomainResolver<ToStringArray | null, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields | null, TypeParent, Context>;

    packets?: PacketsResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = ToNumberArray | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = ToStringArray | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PortResolver<
    R = ToNumberArray | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = ToStringArray | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<
    R = GeoEcsFields | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = ToNumberArray | null,
    Parent = DestinationEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace EventEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = EventEcsFields> {
    action?: ActionResolver<ToStringArray | null, TypeParent, Context>;

    category?: CategoryResolver<ToStringArray | null, TypeParent, Context>;

    created?: CreatedResolver<ToDateArray | null, TypeParent, Context>;

    dataset?: DatasetResolver<ToStringArray | null, TypeParent, Context>;

    duration?: DurationResolver<ToNumberArray | null, TypeParent, Context>;

    end?: EndResolver<ToDateArray | null, TypeParent, Context>;

    hash?: HashResolver<ToStringArray | null, TypeParent, Context>;

    id?: IdResolver<ToStringArray | null, TypeParent, Context>;

    kind?: KindResolver<ToStringArray | null, TypeParent, Context>;

    module?: ModuleResolver<ToStringArray | null, TypeParent, Context>;

    original?: OriginalResolver<ToStringArray | null, TypeParent, Context>;

    outcome?: OutcomeResolver<ToStringArray | null, TypeParent, Context>;

    risk_score?: RiskScoreResolver<ToNumberArray | null, TypeParent, Context>;

    risk_score_norm?: RiskScoreNormResolver<ToNumberArray | null, TypeParent, Context>;

    severity?: SeverityResolver<ToNumberArray | null, TypeParent, Context>;

    start?: StartResolver<ToDateArray | null, TypeParent, Context>;

    timezone?: TimezoneResolver<ToStringArray | null, TypeParent, Context>;

    type?: TypeResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type ActionResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CategoryResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CreatedResolver<
    R = ToDateArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DatasetResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DurationResolver<
    R = ToNumberArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = ToDateArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HashResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KindResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ModuleResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OriginalResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OutcomeResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RiskScoreResolver<
    R = ToNumberArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RiskScoreNormResolver<
    R = ToNumberArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SeverityResolver<
    R = ToNumberArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StartResolver<
    R = ToDateArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimezoneResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = ToStringArray | null,
    Parent = EventEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkEcsFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkEcsField> {
    bytes?: BytesResolver<ToNumberArray | null, TypeParent, Context>;

    community_id?: CommunityIdResolver<ToStringArray | null, TypeParent, Context>;

    direction?: DirectionResolver<ToStringArray | null, TypeParent, Context>;

    packets?: PacketsResolver<ToNumberArray | null, TypeParent, Context>;

    protocol?: ProtocolResolver<ToStringArray | null, TypeParent, Context>;

    transport?: TransportResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = ToNumberArray | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CommunityIdResolver<
    R = ToStringArray | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DirectionResolver<
    R = ToStringArray | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = ToNumberArray | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProtocolResolver<
    R = ToStringArray | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransportResolver<
    R = ToStringArray | null,
    Parent = NetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SuricataEcsFields> {
    eve?: EveResolver<SuricataEveData | null, TypeParent, Context>;
  }

  export type EveResolver<
    R = SuricataEveData | null,
    Parent = SuricataEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataEveDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SuricataEveData> {
    alert?: AlertResolver<SuricataAlertData | null, TypeParent, Context>;

    flow_id?: FlowIdResolver<ToNumberArray | null, TypeParent, Context>;

    proto?: ProtoResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type AlertResolver<
    R = SuricataAlertData | null,
    Parent = SuricataEveData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FlowIdResolver<
    R = ToNumberArray | null,
    Parent = SuricataEveData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProtoResolver<
    R = ToStringArray | null,
    Parent = SuricataEveData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SuricataAlertDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SuricataAlertData> {
    signature?: SignatureResolver<ToStringArray | null, TypeParent, Context>;

    signature_id?: SignatureIdResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type SignatureResolver<
    R = ToStringArray | null,
    Parent = SuricataAlertData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SignatureIdResolver<
    R = ToNumberArray | null,
    Parent = SuricataAlertData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsEcsFields> {
    client_certificate?: ClientCertificateResolver<
      TlsClientCertificateData | null,
      TypeParent,
      Context
    >;

    fingerprints?: FingerprintsResolver<TlsFingerprintsData | null, TypeParent, Context>;

    server_certificate?: ServerCertificateResolver<
      TlsServerCertificateData | null,
      TypeParent,
      Context
    >;
  }

  export type ClientCertificateResolver<
    R = TlsClientCertificateData | null,
    Parent = TlsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FingerprintsResolver<
    R = TlsFingerprintsData | null,
    Parent = TlsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ServerCertificateResolver<
    R = TlsServerCertificateData | null,
    Parent = TlsEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsClientCertificateDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsClientCertificateData> {
    fingerprint?: FingerprintResolver<FingerprintData | null, TypeParent, Context>;
  }

  export type FingerprintResolver<
    R = FingerprintData | null,
    Parent = TlsClientCertificateData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace FingerprintDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = FingerprintData> {
    sha1?: Sha1Resolver<ToStringArray | null, TypeParent, Context>;
  }

  export type Sha1Resolver<
    R = ToStringArray | null,
    Parent = FingerprintData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsFingerprintsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsFingerprintsData> {
    ja3?: Ja3Resolver<TlsJa3Data | null, TypeParent, Context>;
  }

  export type Ja3Resolver<
    R = TlsJa3Data | null,
    Parent = TlsFingerprintsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsJa3DataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsJa3Data> {
    hash?: HashResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type HashResolver<
    R = ToStringArray | null,
    Parent = TlsJa3Data,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsServerCertificateDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsServerCertificateData> {
    fingerprint?: FingerprintResolver<FingerprintData | null, TypeParent, Context>;
  }

  export type FingerprintResolver<
    R = FingerprintData | null,
    Parent = TlsServerCertificateData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekEcsFields> {
    session_id?: SessionIdResolver<ToStringArray | null, TypeParent, Context>;

    connection?: ConnectionResolver<ZeekConnectionData | null, TypeParent, Context>;

    notice?: NoticeResolver<ZeekNoticeData | null, TypeParent, Context>;

    dns?: DnsResolver<ZeekDnsData | null, TypeParent, Context>;

    http?: HttpResolver<ZeekHttpData | null, TypeParent, Context>;

    files?: FilesResolver<ZeekFileData | null, TypeParent, Context>;

    ssl?: SslResolver<ZeekSslData | null, TypeParent, Context>;
  }

  export type SessionIdResolver<
    R = ToStringArray | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ConnectionResolver<
    R = ZeekConnectionData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoticeResolver<
    R = ZeekNoticeData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsResolver<
    R = ZeekDnsData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HttpResolver<
    R = ZeekHttpData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilesResolver<
    R = ZeekFileData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SslResolver<
    R = ZeekSslData | null,
    Parent = ZeekEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekConnectionDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekConnectionData> {
    local_resp?: LocalRespResolver<ToBooleanArray | null, TypeParent, Context>;

    local_orig?: LocalOrigResolver<ToBooleanArray | null, TypeParent, Context>;

    missed_bytes?: MissedBytesResolver<ToNumberArray | null, TypeParent, Context>;

    state?: StateResolver<ToStringArray | null, TypeParent, Context>;

    history?: HistoryResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type LocalRespResolver<
    R = ToBooleanArray | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LocalOrigResolver<
    R = ToBooleanArray | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MissedBytesResolver<
    R = ToNumberArray | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StateResolver<
    R = ToStringArray | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HistoryResolver<
    R = ToStringArray | null,
    Parent = ZeekConnectionData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekNoticeDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekNoticeData> {
    suppress_for?: SuppressForResolver<ToNumberArray | null, TypeParent, Context>;

    msg?: MsgResolver<ToStringArray | null, TypeParent, Context>;

    note?: NoteResolver<ToStringArray | null, TypeParent, Context>;

    sub?: SubResolver<ToStringArray | null, TypeParent, Context>;

    dst?: DstResolver<ToStringArray | null, TypeParent, Context>;

    dropped?: DroppedResolver<ToBooleanArray | null, TypeParent, Context>;

    peer_descr?: PeerDescrResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type SuppressForResolver<
    R = ToNumberArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MsgResolver<
    R = ToStringArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoteResolver<
    R = ToStringArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SubResolver<
    R = ToStringArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DstResolver<
    R = ToStringArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DroppedResolver<
    R = ToBooleanArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PeerDescrResolver<
    R = ToStringArray | null,
    Parent = ZeekNoticeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekDnsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekDnsData> {
    AA?: AaResolver<ToBooleanArray | null, TypeParent, Context>;

    qclass_name?: QclassNameResolver<ToStringArray | null, TypeParent, Context>;

    RD?: RdResolver<ToBooleanArray | null, TypeParent, Context>;

    qtype_name?: QtypeNameResolver<ToStringArray | null, TypeParent, Context>;

    rejected?: RejectedResolver<ToBooleanArray | null, TypeParent, Context>;

    qtype?: QtypeResolver<ToStringArray | null, TypeParent, Context>;

    query?: QueryResolver<ToStringArray | null, TypeParent, Context>;

    trans_id?: TransIdResolver<ToNumberArray | null, TypeParent, Context>;

    qclass?: QclassResolver<ToStringArray | null, TypeParent, Context>;

    RA?: RaResolver<ToBooleanArray | null, TypeParent, Context>;

    TC?: TcResolver<ToBooleanArray | null, TypeParent, Context>;
  }

  export type AaResolver<
    R = ToBooleanArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QclassNameResolver<
    R = ToStringArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RdResolver<
    R = ToBooleanArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QtypeNameResolver<
    R = ToStringArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RejectedResolver<
    R = ToBooleanArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QtypeResolver<
    R = ToStringArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QueryResolver<
    R = ToStringArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransIdResolver<
    R = ToNumberArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QclassResolver<
    R = ToStringArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RaResolver<
    R = ToBooleanArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TcResolver<
    R = ToBooleanArray | null,
    Parent = ZeekDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekHttpDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekHttpData> {
    resp_mime_types?: RespMimeTypesResolver<ToStringArray | null, TypeParent, Context>;

    trans_depth?: TransDepthResolver<ToStringArray | null, TypeParent, Context>;

    status_msg?: StatusMsgResolver<ToStringArray | null, TypeParent, Context>;

    resp_fuids?: RespFuidsResolver<ToStringArray | null, TypeParent, Context>;

    tags?: TagsResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type RespMimeTypesResolver<
    R = ToStringArray | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransDepthResolver<
    R = ToStringArray | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StatusMsgResolver<
    R = ToStringArray | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RespFuidsResolver<
    R = ToStringArray | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TagsResolver<
    R = ToStringArray | null,
    Parent = ZeekHttpData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekFileDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekFileData> {
    session_ids?: SessionIdsResolver<ToStringArray | null, TypeParent, Context>;

    timedout?: TimedoutResolver<ToBooleanArray | null, TypeParent, Context>;

    local_orig?: LocalOrigResolver<ToBooleanArray | null, TypeParent, Context>;

    tx_host?: TxHostResolver<ToStringArray | null, TypeParent, Context>;

    source?: SourceResolver<ToStringArray | null, TypeParent, Context>;

    is_orig?: IsOrigResolver<ToBooleanArray | null, TypeParent, Context>;

    overflow_bytes?: OverflowBytesResolver<ToNumberArray | null, TypeParent, Context>;

    sha1?: Sha1Resolver<ToStringArray | null, TypeParent, Context>;

    duration?: DurationResolver<ToNumberArray | null, TypeParent, Context>;

    depth?: DepthResolver<ToNumberArray | null, TypeParent, Context>;

    analyzers?: AnalyzersResolver<ToStringArray | null, TypeParent, Context>;

    mime_type?: MimeTypeResolver<ToStringArray | null, TypeParent, Context>;

    rx_host?: RxHostResolver<ToStringArray | null, TypeParent, Context>;

    total_bytes?: TotalBytesResolver<ToNumberArray | null, TypeParent, Context>;

    fuid?: FuidResolver<ToStringArray | null, TypeParent, Context>;

    seen_bytes?: SeenBytesResolver<ToNumberArray | null, TypeParent, Context>;

    missing_bytes?: MissingBytesResolver<ToNumberArray | null, TypeParent, Context>;

    md5?: Md5Resolver<ToStringArray | null, TypeParent, Context>;
  }

  export type SessionIdsResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimedoutResolver<
    R = ToBooleanArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LocalOrigResolver<
    R = ToBooleanArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TxHostResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IsOrigResolver<
    R = ToBooleanArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OverflowBytesResolver<
    R = ToNumberArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type Sha1Resolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DurationResolver<
    R = ToNumberArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DepthResolver<
    R = ToNumberArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AnalyzersResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MimeTypeResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RxHostResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalBytesResolver<
    R = ToNumberArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FuidResolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SeenBytesResolver<
    R = ToNumberArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MissingBytesResolver<
    R = ToNumberArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type Md5Resolver<
    R = ToStringArray | null,
    Parent = ZeekFileData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ZeekSslDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ZeekSslData> {
    cipher?: CipherResolver<ToStringArray | null, TypeParent, Context>;

    established?: EstablishedResolver<ToBooleanArray | null, TypeParent, Context>;

    resumed?: ResumedResolver<ToBooleanArray | null, TypeParent, Context>;

    version?: VersionResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type CipherResolver<
    R = ToStringArray | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EstablishedResolver<
    R = ToBooleanArray | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ResumedResolver<
    R = ToBooleanArray | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = ToStringArray | null,
    Parent = ZeekSslData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpEcsFields> {
    version?: VersionResolver<ToStringArray | null, TypeParent, Context>;

    request?: RequestResolver<HttpRequestData | null, TypeParent, Context>;

    response?: ResponseResolver<HttpResponseData | null, TypeParent, Context>;
  }

  export type VersionResolver<
    R = ToStringArray | null,
    Parent = HttpEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RequestResolver<
    R = HttpRequestData | null,
    Parent = HttpEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ResponseResolver<
    R = HttpResponseData | null,
    Parent = HttpEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpRequestDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpRequestData> {
    method?: MethodResolver<ToStringArray | null, TypeParent, Context>;

    body?: BodyResolver<HttpBodyData | null, TypeParent, Context>;

    referrer?: ReferrerResolver<ToStringArray | null, TypeParent, Context>;

    bytes?: BytesResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type MethodResolver<
    R = ToStringArray | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BodyResolver<
    R = HttpBodyData | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ReferrerResolver<
    R = ToStringArray | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BytesResolver<
    R = ToNumberArray | null,
    Parent = HttpRequestData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpBodyDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpBodyData> {
    content?: ContentResolver<ToStringArray | null, TypeParent, Context>;

    bytes?: BytesResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type ContentResolver<
    R = ToStringArray | null,
    Parent = HttpBodyData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BytesResolver<
    R = ToNumberArray | null,
    Parent = HttpBodyData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HttpResponseDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HttpResponseData> {
    status_code?: StatusCodeResolver<ToNumberArray | null, TypeParent, Context>;

    body?: BodyResolver<HttpBodyData | null, TypeParent, Context>;

    bytes?: BytesResolver<ToNumberArray | null, TypeParent, Context>;
  }

  export type StatusCodeResolver<
    R = ToNumberArray | null,
    Parent = HttpResponseData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BodyResolver<
    R = HttpBodyData | null,
    Parent = HttpResponseData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type BytesResolver<
    R = ToNumberArray | null,
    Parent = HttpResponseData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UrlEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UrlEcsFields> {
    domain?: DomainResolver<ToStringArray | null, TypeParent, Context>;

    original?: OriginalResolver<ToStringArray | null, TypeParent, Context>;

    username?: UsernameResolver<ToStringArray | null, TypeParent, Context>;

    password?: PasswordResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type DomainResolver<
    R = ToStringArray | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OriginalResolver<
    R = ToStringArray | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UsernameResolver<
    R = ToStringArray | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PasswordResolver<
    R = ToStringArray | null,
    Parent = UrlEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ProcessEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ProcessEcsFields> {
    pid?: PidResolver<ToNumberArray | null, TypeParent, Context>;

    name?: NameResolver<ToStringArray | null, TypeParent, Context>;

    ppid?: PpidResolver<ToNumberArray | null, TypeParent, Context>;

    args?: ArgsResolver<ToStringArray | null, TypeParent, Context>;

    executable?: ExecutableResolver<ToStringArray | null, TypeParent, Context>;

    title?: TitleResolver<ToStringArray | null, TypeParent, Context>;

    thread?: ThreadResolver<Thread | null, TypeParent, Context>;

    working_directory?: WorkingDirectoryResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type PidResolver<
    R = ToNumberArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = ToStringArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PpidResolver<
    R = ToNumberArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ArgsResolver<
    R = ToStringArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExecutableResolver<
    R = ToStringArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TitleResolver<
    R = ToStringArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ThreadResolver<
    R = Thread | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type WorkingDirectoryResolver<
    R = ToStringArray | null,
    Parent = ProcessEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ThreadResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Thread> {
    id?: IdResolver<ToNumberArray | null, TypeParent, Context>;

    start?: StartResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = ToNumberArray | null,
    Parent = Thread,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type StartResolver<
    R = ToStringArray | null,
    Parent = Thread,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace FileFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = FileFields> {
    path?: PathResolver<ToStringArray | null, TypeParent, Context>;

    target_path?: TargetPathResolver<ToStringArray | null, TypeParent, Context>;

    extension?: ExtensionResolver<ToStringArray | null, TypeParent, Context>;

    type?: TypeResolver<ToStringArray | null, TypeParent, Context>;

    device?: DeviceResolver<ToStringArray | null, TypeParent, Context>;

    inode?: InodeResolver<ToStringArray | null, TypeParent, Context>;

    uid?: UidResolver<ToStringArray | null, TypeParent, Context>;

    owner?: OwnerResolver<ToStringArray | null, TypeParent, Context>;

    gid?: GidResolver<ToStringArray | null, TypeParent, Context>;

    group?: GroupResolver<ToStringArray | null, TypeParent, Context>;

    mode?: ModeResolver<ToStringArray | null, TypeParent, Context>;

    size?: SizeResolver<ToNumberArray | null, TypeParent, Context>;

    mtime?: MtimeResolver<ToDateArray | null, TypeParent, Context>;

    ctime?: CtimeResolver<ToDateArray | null, TypeParent, Context>;
  }

  export type PathResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TargetPathResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExtensionResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DeviceResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InodeResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UidResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OwnerResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GidResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GroupResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ModeResolver<
    R = ToStringArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SizeResolver<
    R = ToNumberArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MtimeResolver<
    R = ToDateArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CtimeResolver<
    R = ToDateArray | null,
    Parent = FileFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SystemEcsFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SystemEcsField> {
    audit?: AuditResolver<AuditEcsFields | null, TypeParent, Context>;

    auth?: AuthResolver<AuthEcsFields | null, TypeParent, Context>;
  }

  export type AuditResolver<
    R = AuditEcsFields | null,
    Parent = SystemEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthResolver<
    R = AuthEcsFields | null,
    Parent = SystemEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuditEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuditEcsFields> {
    package?: PackageResolver<PackageEcsFields | null, TypeParent, Context>;
  }

  export type PackageResolver<
    R = PackageEcsFields | null,
    Parent = AuditEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace PackageEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = PackageEcsFields> {
    arch?: ArchResolver<ToStringArray | null, TypeParent, Context>;

    entity_id?: EntityIdResolver<ToStringArray | null, TypeParent, Context>;

    name?: NameResolver<ToStringArray | null, TypeParent, Context>;

    size?: SizeResolver<ToNumberArray | null, TypeParent, Context>;

    summary?: SummaryResolver<ToStringArray | null, TypeParent, Context>;

    version?: VersionResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type ArchResolver<
    R = ToStringArray | null,
    Parent = PackageEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EntityIdResolver<
    R = ToStringArray | null,
    Parent = PackageEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = ToStringArray | null,
    Parent = PackageEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SizeResolver<
    R = ToNumberArray | null,
    Parent = PackageEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SummaryResolver<
    R = ToStringArray | null,
    Parent = PackageEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = ToStringArray | null,
    Parent = PackageEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace AuthEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AuthEcsFields> {
    ssh?: SshResolver<SshEcsFields | null, TypeParent, Context>;
  }

  export type SshResolver<
    R = SshEcsFields | null,
    Parent = AuthEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SshEcsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SshEcsFields> {
    method?: MethodResolver<ToStringArray | null, TypeParent, Context>;

    signature?: SignatureResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type MethodResolver<
    R = ToStringArray | null,
    Parent = SshEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SignatureResolver<
    R = ToStringArray | null,
    Parent = SshEcsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineData> {
    edges?: EdgesResolver<TimelineEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = TimelineEdges[],
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = TimelineData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineEdges> {
    node?: NodeResolver<TimelineItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = TimelineItem,
    Parent = TimelineEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = TimelineEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    _index?: IndexResolver<string | null, TypeParent, Context>;

    data?: DataResolver<TimelineNonEcsData[], TypeParent, Context>;

    ecs?: EcsResolver<Ecs, TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = TimelineItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<
    R = string | null,
    Parent = TimelineItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DataResolver<
    R = TimelineNonEcsData[],
    Parent = TimelineItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EcsResolver<R = Ecs, Parent = TimelineItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace TimelineNonEcsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineNonEcsData> {
    field?: FieldResolver<string, TypeParent, Context>;

    value?: ValueResolver<ToStringArray | null, TypeParent, Context>;
  }

  export type FieldResolver<
    R = string,
    Parent = TimelineNonEcsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = ToStringArray | null,
    Parent = TimelineNonEcsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TimelineDetailsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineDetailsData> {
    data?: DataResolver<DetailItem[] | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type DataResolver<
    R = DetailItem[] | null,
    Parent = TimelineDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = TimelineDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DetailItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DetailItem> {
    category?: CategoryResolver<string, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    example?: ExampleResolver<string | null, TypeParent, Context>;

    field?: FieldResolver<string, TypeParent, Context>;

    type?: TypeResolver<string, TypeParent, Context>;

    values?: ValuesResolver<ToStringArray | null, TypeParent, Context>;

    originalValue?: OriginalValueResolver<EsValue | null, TypeParent, Context>;
  }

  export type CategoryResolver<R = string, Parent = DetailItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type DescriptionResolver<
    R = string | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExampleResolver<
    R = string | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FieldResolver<R = string, Parent = DetailItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = DetailItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ValuesResolver<
    R = ToStringArray | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OriginalValueResolver<
    R = EsValue | null,
    Parent = DetailItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace LastEventTimeDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = LastEventTimeData> {
    lastSeen?: LastSeenResolver<Date | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type LastSeenResolver<
    R = Date | null,
    Parent = LastEventTimeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = LastEventTimeData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostsData> {
    edges?: EdgesResolver<HostsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<R = HostsEdges[], Parent = HostsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TotalCountResolver<R = number, Parent = HostsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PageInfoResolver<R = PageInfo, Parent = HostsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type InspectResolver<
    R = Inspect | null,
    Parent = HostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostsEdges> {
    node?: NodeResolver<HostItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = HostItem, Parent = HostsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = HostsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace HostItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    lastSeen?: LastSeenResolver<Date | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields | null, TypeParent, Context>;

    cloud?: CloudResolver<CloudFields | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = HostItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type LastSeenResolver<
    R = Date | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CloudResolver<
    R = CloudFields | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = HostItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace CloudFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = CloudFields> {
    instance?: InstanceResolver<CloudInstance | null, TypeParent, Context>;

    machine?: MachineResolver<CloudMachine | null, TypeParent, Context>;

    provider?: ProviderResolver<(string | null)[] | null, TypeParent, Context>;

    region?: RegionResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type InstanceResolver<
    R = CloudInstance | null,
    Parent = CloudFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MachineResolver<
    R = CloudMachine | null,
    Parent = CloudFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProviderResolver<
    R = (string | null)[] | null,
    Parent = CloudFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type RegionResolver<
    R = (string | null)[] | null,
    Parent = CloudFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace CloudInstanceResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = CloudInstance> {
    id?: IdResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = (string | null)[] | null,
    Parent = CloudInstance,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace CloudMachineResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = CloudMachine> {
    type?: TypeResolver<(string | null)[] | null, TypeParent, Context>;
  }

  export type TypeResolver<
    R = (string | null)[] | null,
    Parent = CloudMachine,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace FirstLastSeenHostResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = FirstLastSeenHost> {
    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;

    firstSeen?: FirstSeenResolver<Date | null, TypeParent, Context>;

    lastSeen?: LastSeenResolver<Date | null, TypeParent, Context>;
  }

  export type InspectResolver<
    R = Inspect | null,
    Parent = FirstLastSeenHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FirstSeenResolver<
    R = Date | null,
    Parent = FirstLastSeenHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastSeenResolver<
    R = Date | null,
    Parent = FirstLastSeenHost,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace IpOverviewDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = IpOverviewData> {
    client?: ClientResolver<Overview | null, TypeParent, Context>;

    destination?: DestinationResolver<Overview | null, TypeParent, Context>;

    host?: HostResolver<HostEcsFields, TypeParent, Context>;

    server?: ServerResolver<Overview | null, TypeParent, Context>;

    source?: SourceResolver<Overview | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type ClientResolver<
    R = Overview | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = Overview | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = HostEcsFields,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ServerResolver<
    R = Overview | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = Overview | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = IpOverviewData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OverviewResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = Overview> {
    firstSeen?: FirstSeenResolver<Date | null, TypeParent, Context>;

    lastSeen?: LastSeenResolver<Date | null, TypeParent, Context>;

    autonomousSystem?: AutonomousSystemResolver<AutonomousSystem, TypeParent, Context>;

    geo?: GeoResolver<GeoEcsFields, TypeParent, Context>;
  }

  export type FirstSeenResolver<
    R = Date | null,
    Parent = Overview,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastSeenResolver<
    R = Date | null,
    Parent = Overview,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AutonomousSystemResolver<
    R = AutonomousSystem,
    Parent = Overview,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GeoResolver<R = GeoEcsFields, Parent = Overview, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace AutonomousSystemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = AutonomousSystem> {
    as_org?: AsOrgResolver<string | null, TypeParent, Context>;

    asn?: AsnResolver<string | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;
  }

  export type AsOrgResolver<
    R = string | null,
    Parent = AutonomousSystem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AsnResolver<
    R = string | null,
    Parent = AutonomousSystem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = AutonomousSystem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DomainsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DomainsData> {
    edges?: EdgesResolver<DomainsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = DomainsEdges[],
    Parent = DomainsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = DomainsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = DomainsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = DomainsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DomainsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DomainsEdges> {
    node?: NodeResolver<DomainsNode, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = DomainsNode,
    Parent = DomainsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = DomainsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DomainsNodeResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DomainsNode> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    source?: SourceResolver<DomainsItem | null, TypeParent, Context>;

    destination?: DestinationResolver<DomainsItem | null, TypeParent, Context>;

    client?: ClientResolver<DomainsItem | null, TypeParent, Context>;

    server?: ServerResolver<DomainsItem | null, TypeParent, Context>;

    network?: NetworkResolver<DomainsNetworkField | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = DomainsNode, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<
    R = Date | null,
    Parent = DomainsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = DomainsItem | null,
    Parent = DomainsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = DomainsItem | null,
    Parent = DomainsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ClientResolver<
    R = DomainsItem | null,
    Parent = DomainsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ServerResolver<
    R = DomainsItem | null,
    Parent = DomainsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NetworkResolver<
    R = DomainsNetworkField | null,
    Parent = DomainsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DomainsItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DomainsItem> {
    uniqueIpCount?: UniqueIpCountResolver<number | null, TypeParent, Context>;

    domainName?: DomainNameResolver<string | null, TypeParent, Context>;

    firstSeen?: FirstSeenResolver<Date | null, TypeParent, Context>;

    lastSeen?: LastSeenResolver<Date | null, TypeParent, Context>;
  }

  export type UniqueIpCountResolver<
    R = number | null,
    Parent = DomainsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainNameResolver<
    R = string | null,
    Parent = DomainsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FirstSeenResolver<
    R = Date | null,
    Parent = DomainsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type LastSeenResolver<
    R = Date | null,
    Parent = DomainsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DomainsNetworkFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DomainsNetworkField> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;

    transport?: TransportResolver<string | null, TypeParent, Context>;

    direction?: DirectionResolver<NetworkDirectionEcs[] | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = DomainsNetworkField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = DomainsNetworkField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransportResolver<
    R = string | null,
    Parent = DomainsNetworkField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DirectionResolver<
    R = NetworkDirectionEcs[] | null,
    Parent = DomainsNetworkField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsData> {
    edges?: EdgesResolver<TlsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<R = TlsEdges[], Parent = TlsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TotalCountResolver<R = number, Parent = TlsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PageInfoResolver<R = PageInfo, Parent = TlsData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type InspectResolver<
    R = Inspect | null,
    Parent = TlsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TlsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsEdges> {
    node?: NodeResolver<TlsNode, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = TlsNode, Parent = TlsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = TlsEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace TlsNodeResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TlsNode> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    alternativeNames?: AlternativeNamesResolver<string[] | null, TypeParent, Context>;

    notAfter?: NotAfterResolver<string[] | null, TypeParent, Context>;

    commonNames?: CommonNamesResolver<string[] | null, TypeParent, Context>;

    ja3?: Ja3Resolver<string[] | null, TypeParent, Context>;

    issuerNames?: IssuerNamesResolver<string[] | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = TlsNode, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<
    R = Date | null,
    Parent = TlsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AlternativeNamesResolver<
    R = string[] | null,
    Parent = TlsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NotAfterResolver<
    R = string[] | null,
    Parent = TlsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CommonNamesResolver<
    R = string[] | null,
    Parent = TlsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type Ja3Resolver<R = string[] | null, Parent = TlsNode, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IssuerNamesResolver<
    R = string[] | null,
    Parent = TlsNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UsersDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UsersData> {
    edges?: EdgesResolver<UsersEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<R = UsersEdges[], Parent = UsersData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TotalCountResolver<R = number, Parent = UsersData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type PageInfoResolver<R = PageInfo, Parent = UsersData, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type InspectResolver<
    R = Inspect | null,
    Parent = UsersData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UsersEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UsersEdges> {
    node?: NodeResolver<UsersNode, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<R = UsersNode, Parent = UsersEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type CursorResolver<R = CursorType, Parent = UsersEdges, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace UsersNodeResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UsersNode> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    timestamp?: TimestampResolver<Date | null, TypeParent, Context>;

    user?: UserResolver<UsersItem | null, TypeParent, Context>;
  }

  export type IdResolver<R = string | null, Parent = UsersNode, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TimestampResolver<
    R = Date | null,
    Parent = UsersNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UsersItem | null,
    Parent = UsersNode,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UsersItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UsersItem> {
    name?: NameResolver<string | null, TypeParent, Context>;

    id?: IdResolver<ToStringArray | null, TypeParent, Context>;

    groupId?: GroupIdResolver<ToStringArray | null, TypeParent, Context>;

    groupName?: GroupNameResolver<ToStringArray | null, TypeParent, Context>;

    count?: CountResolver<number | null, TypeParent, Context>;
  }

  export type NameResolver<R = string | null, Parent = UsersItem, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IdResolver<
    R = ToStringArray | null,
    Parent = UsersItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GroupIdResolver<
    R = ToStringArray | null,
    Parent = UsersItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type GroupNameResolver<
    R = ToStringArray | null,
    Parent = UsersItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CountResolver<
    R = number | null,
    Parent = UsersItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiNetworkDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiNetworkData> {
    networkEvents?: NetworkEventsResolver<number | null, TypeParent, Context>;

    uniqueFlowId?: UniqueFlowIdResolver<number | null, TypeParent, Context>;

    uniqueSourcePrivateIps?: UniqueSourcePrivateIpsResolver<number | null, TypeParent, Context>;

    uniqueSourcePrivateIpsHistogram?: UniqueSourcePrivateIpsHistogramResolver<
      KpiNetworkHistogramData[] | null,
      TypeParent,
      Context
    >;

    uniqueDestinationPrivateIps?: UniqueDestinationPrivateIpsResolver<
      number | null,
      TypeParent,
      Context
    >;

    uniqueDestinationPrivateIpsHistogram?: UniqueDestinationPrivateIpsHistogramResolver<
      KpiNetworkHistogramData[] | null,
      TypeParent,
      Context
    >;

    dnsQueries?: DnsQueriesResolver<number | null, TypeParent, Context>;

    tlsHandshakes?: TlsHandshakesResolver<number | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type NetworkEventsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueFlowIdResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourcePrivateIpsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourcePrivateIpsHistogramResolver<
    R = KpiNetworkHistogramData[] | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationPrivateIpsResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationPrivateIpsHistogramResolver<
    R = KpiNetworkHistogramData[] | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsQueriesResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TlsHandshakesResolver<
    R = number | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = KpiNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiNetworkHistogramDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiNetworkHistogramData> {
    x?: XResolver<number | null, TypeParent, Context>;

    y?: YResolver<number | null, TypeParent, Context>;
  }

  export type XResolver<
    R = number | null,
    Parent = KpiNetworkHistogramData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type YResolver<
    R = number | null,
    Parent = KpiNetworkHistogramData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiHostsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiHostsData> {
    hosts?: HostsResolver<number | null, TypeParent, Context>;

    hostsHistogram?: HostsHistogramResolver<KpiHostHistogramData[] | null, TypeParent, Context>;

    authSuccess?: AuthSuccessResolver<number | null, TypeParent, Context>;

    authSuccessHistogram?: AuthSuccessHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    authFailure?: AuthFailureResolver<number | null, TypeParent, Context>;

    authFailureHistogram?: AuthFailureHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    uniqueSourceIps?: UniqueSourceIpsResolver<number | null, TypeParent, Context>;

    uniqueSourceIpsHistogram?: UniqueSourceIpsHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    uniqueDestinationIps?: UniqueDestinationIpsResolver<number | null, TypeParent, Context>;

    uniqueDestinationIpsHistogram?: UniqueDestinationIpsHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type HostsResolver<
    R = number | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostsHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthSuccessResolver<
    R = number | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthSuccessHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthFailureResolver<
    R = number | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthFailureHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourceIpsResolver<
    R = number | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourceIpsHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationIpsResolver<
    R = number | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationIpsHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = KpiHostsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiHostHistogramDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiHostHistogramData> {
    x?: XResolver<number | null, TypeParent, Context>;

    y?: YResolver<number | null, TypeParent, Context>;
  }

  export type XResolver<
    R = number | null,
    Parent = KpiHostHistogramData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type YResolver<
    R = number | null,
    Parent = KpiHostHistogramData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KpiHostDetailsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KpiHostDetailsData> {
    authSuccess?: AuthSuccessResolver<number | null, TypeParent, Context>;

    authSuccessHistogram?: AuthSuccessHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    authFailure?: AuthFailureResolver<number | null, TypeParent, Context>;

    authFailureHistogram?: AuthFailureHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    uniqueSourceIps?: UniqueSourceIpsResolver<number | null, TypeParent, Context>;

    uniqueSourceIpsHistogram?: UniqueSourceIpsHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    uniqueDestinationIps?: UniqueDestinationIpsResolver<number | null, TypeParent, Context>;

    uniqueDestinationIpsHistogram?: UniqueDestinationIpsHistogramResolver<
      KpiHostHistogramData[] | null,
      TypeParent,
      Context
    >;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type AuthSuccessResolver<
    R = number | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthSuccessHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthFailureResolver<
    R = number | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuthFailureHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourceIpsResolver<
    R = number | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueSourceIpsHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationIpsResolver<
    R = number | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDestinationIpsHistogramResolver<
    R = KpiHostHistogramData[] | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = KpiHostDetailsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkTopNFlowData> {
    edges?: EdgesResolver<NetworkTopNFlowEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = NetworkTopNFlowEdges[],
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = NetworkTopNFlowData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkTopNFlowEdges> {
    node?: NodeResolver<NetworkTopNFlowItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = NetworkTopNFlowItem,
    Parent = NetworkTopNFlowEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkTopNFlowEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkTopNFlowItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkTopNFlowItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    source?: SourceResolver<TopNFlowItem | null, TypeParent, Context>;

    destination?: DestinationResolver<TopNFlowItem | null, TypeParent, Context>;

    client?: ClientResolver<TopNFlowItem | null, TypeParent, Context>;

    server?: ServerResolver<TopNFlowItem | null, TypeParent, Context>;

    network?: NetworkResolver<TopNFlowNetworkEcsField | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SourceResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DestinationResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ClientResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ServerResolver<
    R = TopNFlowItem | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NetworkResolver<
    R = TopNFlowNetworkEcsField | null,
    Parent = NetworkTopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TopNFlowItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TopNFlowItem> {
    count?: CountResolver<number | null, TypeParent, Context>;

    domain?: DomainResolver<string[] | null, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;
  }

  export type CountResolver<
    R = number | null,
    Parent = TopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DomainResolver<
    R = string[] | null,
    Parent = TopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = TopNFlowItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace TopNFlowNetworkEcsFieldResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TopNFlowNetworkEcsField> {
    bytes?: BytesResolver<number | null, TypeParent, Context>;

    packets?: PacketsResolver<number | null, TypeParent, Context>;

    transport?: TransportResolver<string | null, TypeParent, Context>;

    direction?: DirectionResolver<NetworkDirectionEcs[] | null, TypeParent, Context>;
  }

  export type BytesResolver<
    R = number | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketsResolver<
    R = number | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TransportResolver<
    R = string | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DirectionResolver<
    R = NetworkDirectionEcs[] | null,
    Parent = TopNFlowNetworkEcsField,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkDnsDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkDnsData> {
    edges?: EdgesResolver<NetworkDnsEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = NetworkDnsEdges[],
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = NetworkDnsData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkDnsEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkDnsEdges> {
    node?: NodeResolver<NetworkDnsItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = NetworkDnsItem,
    Parent = NetworkDnsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = NetworkDnsEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace NetworkDnsItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = NetworkDnsItem> {
    _id?: IdResolver<string | null, TypeParent, Context>;

    dnsBytesIn?: DnsBytesInResolver<number | null, TypeParent, Context>;

    dnsBytesOut?: DnsBytesOutResolver<number | null, TypeParent, Context>;

    dnsName?: DnsNameResolver<string | null, TypeParent, Context>;

    queryCount?: QueryCountResolver<number | null, TypeParent, Context>;

    uniqueDomains?: UniqueDomainsResolver<number | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsBytesInResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsBytesOutResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DnsNameResolver<
    R = string | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QueryCountResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UniqueDomainsResolver<
    R = number | null,
    Parent = NetworkDnsItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OverviewNetworkDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OverviewNetworkData> {
    auditbeatSocket?: AuditbeatSocketResolver<number | null, TypeParent, Context>;

    filebeatCisco?: FilebeatCiscoResolver<number | null, TypeParent, Context>;

    filebeatNetflow?: FilebeatNetflowResolver<number | null, TypeParent, Context>;

    filebeatPanw?: FilebeatPanwResolver<number | null, TypeParent, Context>;

    filebeatSuricata?: FilebeatSuricataResolver<number | null, TypeParent, Context>;

    filebeatZeek?: FilebeatZeekResolver<number | null, TypeParent, Context>;

    packetbeatDNS?: PacketbeatDnsResolver<number | null, TypeParent, Context>;

    packetbeatFlow?: PacketbeatFlowResolver<number | null, TypeParent, Context>;

    packetbeatTLS?: PacketbeatTlsResolver<number | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type AuditbeatSocketResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatCiscoResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatNetflowResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatPanwResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatSuricataResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatZeekResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatDnsResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatFlowResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PacketbeatTlsResolver<
    R = number | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = OverviewNetworkData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OverviewHostDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OverviewHostData> {
    auditbeatAuditd?: AuditbeatAuditdResolver<number | null, TypeParent, Context>;

    auditbeatFIM?: AuditbeatFimResolver<number | null, TypeParent, Context>;

    auditbeatLogin?: AuditbeatLoginResolver<number | null, TypeParent, Context>;

    auditbeatPackage?: AuditbeatPackageResolver<number | null, TypeParent, Context>;

    auditbeatProcess?: AuditbeatProcessResolver<number | null, TypeParent, Context>;

    auditbeatUser?: AuditbeatUserResolver<number | null, TypeParent, Context>;

    filebeatSystemModule?: FilebeatSystemModuleResolver<number | null, TypeParent, Context>;

    winlogbeat?: WinlogbeatResolver<number | null, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type AuditbeatAuditdResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatFimResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatLoginResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatPackageResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatProcessResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AuditbeatUserResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FilebeatSystemModuleResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type WinlogbeatResolver<
    R = number | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = OverviewHostData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessesDataResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UncommonProcessesData> {
    edges?: EdgesResolver<UncommonProcessesEdges[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number, TypeParent, Context>;

    pageInfo?: PageInfoResolver<PageInfo, TypeParent, Context>;

    inspect?: InspectResolver<Inspect | null, TypeParent, Context>;
  }

  export type EdgesResolver<
    R = UncommonProcessesEdges[],
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number,
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PageInfoResolver<
    R = PageInfo,
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InspectResolver<
    R = Inspect | null,
    Parent = UncommonProcessesData,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessesEdgesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UncommonProcessesEdges> {
    node?: NodeResolver<UncommonProcessItem, TypeParent, Context>;

    cursor?: CursorResolver<CursorType, TypeParent, Context>;
  }

  export type NodeResolver<
    R = UncommonProcessItem,
    Parent = UncommonProcessesEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CursorResolver<
    R = CursorType,
    Parent = UncommonProcessesEdges,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace UncommonProcessItemResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = UncommonProcessItem> {
    _id?: IdResolver<string, TypeParent, Context>;

    instances?: InstancesResolver<number, TypeParent, Context>;

    process?: ProcessResolver<ProcessEcsFields, TypeParent, Context>;

    hosts?: HostsResolver<HostEcsFields[], TypeParent, Context>;

    user?: UserResolver<UserEcsFields | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type InstancesResolver<
    R = number,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ProcessResolver<
    R = ProcessEcsFields,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type HostsResolver<
    R = HostEcsFields[],
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserResolver<
    R = UserEcsFields | null,
    Parent = UncommonProcessItem,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SayMyNameResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SayMyName> {
    /** The id of the source */
    appName?: AppNameResolver<string, TypeParent, Context>;
  }

  export type AppNameResolver<R = string, Parent = SayMyName, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace TimelineResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = TimelineResult> {
    savedObjectId?: SavedObjectIdResolver<string, TypeParent, Context>;

    columns?: ColumnsResolver<ColumnHeaderResult[] | null, TypeParent, Context>;

    dataProviders?: DataProvidersResolver<DataProviderResult[] | null, TypeParent, Context>;

    dateRange?: DateRangeResolver<DateRangePickerResult | null, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    eventIdToNoteIds?: EventIdToNoteIdsResolver<NoteResult[] | null, TypeParent, Context>;

    favorite?: FavoriteResolver<FavoriteTimelineResult[] | null, TypeParent, Context>;

    kqlMode?: KqlModeResolver<string | null, TypeParent, Context>;

    kqlQuery?: KqlQueryResolver<SerializedFilterQueryResult | null, TypeParent, Context>;

    notes?: NotesResolver<NoteResult[] | null, TypeParent, Context>;

    noteIds?: NoteIdsResolver<string[] | null, TypeParent, Context>;

    pinnedEventIds?: PinnedEventIdsResolver<string[] | null, TypeParent, Context>;

    pinnedEventsSaveObject?: PinnedEventsSaveObjectResolver<
      PinnedEvent[] | null,
      TypeParent,
      Context
    >;

    title?: TitleResolver<string | null, TypeParent, Context>;

    sort?: SortResolver<SortTimelineResult | null, TypeParent, Context>;

    created?: CreatedResolver<number | null, TypeParent, Context>;

    createdBy?: CreatedByResolver<string | null, TypeParent, Context>;

    updated?: UpdatedResolver<number | null, TypeParent, Context>;

    updatedBy?: UpdatedByResolver<string | null, TypeParent, Context>;

    version?: VersionResolver<string, TypeParent, Context>;
  }

  export type SavedObjectIdResolver<
    R = string,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ColumnsResolver<
    R = ColumnHeaderResult[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DataProvidersResolver<
    R = DataProviderResult[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DateRangeResolver<
    R = DateRangePickerResult | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EventIdToNoteIdsResolver<
    R = NoteResult[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FavoriteResolver<
    R = FavoriteTimelineResult[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KqlModeResolver<
    R = string | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KqlQueryResolver<
    R = SerializedFilterQueryResult | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NotesResolver<
    R = NoteResult[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoteIdsResolver<
    R = string[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PinnedEventIdsResolver<
    R = string[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PinnedEventsSaveObjectResolver<
    R = PinnedEvent[] | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TitleResolver<
    R = string | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SortResolver<
    R = SortTimelineResult | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CreatedResolver<
    R = number | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CreatedByResolver<
    R = string | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedResolver<
    R = number | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedByResolver<
    R = string | null,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string,
    Parent = TimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ColumnHeaderResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ColumnHeaderResult> {
    aggregatable?: AggregatableResolver<boolean | null, TypeParent, Context>;

    category?: CategoryResolver<string | null, TypeParent, Context>;

    columnHeaderType?: ColumnHeaderTypeResolver<string | null, TypeParent, Context>;

    description?: DescriptionResolver<string | null, TypeParent, Context>;

    example?: ExampleResolver<string | null, TypeParent, Context>;

    indexes?: IndexesResolver<string[] | null, TypeParent, Context>;

    id?: IdResolver<string | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    placeholder?: PlaceholderResolver<string | null, TypeParent, Context>;

    searchable?: SearchableResolver<boolean | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;
  }

  export type AggregatableResolver<
    R = boolean | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type CategoryResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ColumnHeaderTypeResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExampleResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IndexesResolver<
    R = string[] | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type PlaceholderResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SearchableResolver<
    R = boolean | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = ColumnHeaderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DataProviderResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DataProviderResult> {
    id?: IdResolver<string | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    enabled?: EnabledResolver<boolean | null, TypeParent, Context>;

    excluded?: ExcludedResolver<boolean | null, TypeParent, Context>;

    kqlQuery?: KqlQueryResolver<string | null, TypeParent, Context>;

    queryMatch?: QueryMatchResolver<QueryMatchResult | null, TypeParent, Context>;

    and?: AndResolver<DataProviderResult[] | null, TypeParent, Context>;
  }

  export type IdResolver<
    R = string | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EnabledResolver<
    R = boolean | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExcludedResolver<
    R = boolean | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KqlQueryResolver<
    R = string | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type QueryMatchResolver<
    R = QueryMatchResult | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type AndResolver<
    R = DataProviderResult[] | null,
    Parent = DataProviderResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace QueryMatchResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = QueryMatchResult> {
    field?: FieldResolver<string | null, TypeParent, Context>;

    displayField?: DisplayFieldResolver<string | null, TypeParent, Context>;

    value?: ValueResolver<string | null, TypeParent, Context>;

    displayValue?: DisplayValueResolver<string | null, TypeParent, Context>;

    operator?: OperatorResolver<string | null, TypeParent, Context>;
  }

  export type FieldResolver<
    R = string | null,
    Parent = QueryMatchResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DisplayFieldResolver<
    R = string | null,
    Parent = QueryMatchResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = string | null,
    Parent = QueryMatchResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type DisplayValueResolver<
    R = string | null,
    Parent = QueryMatchResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OperatorResolver<
    R = string | null,
    Parent = QueryMatchResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace DateRangePickerResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = DateRangePickerResult> {
    start?: StartResolver<number | null, TypeParent, Context>;

    end?: EndResolver<number | null, TypeParent, Context>;
  }

  export type StartResolver<
    R = number | null,
    Parent = DateRangePickerResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = number | null,
    Parent = DateRangePickerResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace FavoriteTimelineResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = FavoriteTimelineResult> {
    fullName?: FullNameResolver<string | null, TypeParent, Context>;

    userName?: UserNameResolver<string | null, TypeParent, Context>;

    favoriteDate?: FavoriteDateResolver<number | null, TypeParent, Context>;
  }

  export type FullNameResolver<
    R = string | null,
    Parent = FavoriteTimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type UserNameResolver<
    R = string | null,
    Parent = FavoriteTimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FavoriteDateResolver<
    R = number | null,
    Parent = FavoriteTimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SerializedFilterQueryResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SerializedFilterQueryResult> {
    filterQuery?: FilterQueryResolver<SerializedKueryQueryResult | null, TypeParent, Context>;
  }

  export type FilterQueryResolver<
    R = SerializedKueryQueryResult | null,
    Parent = SerializedFilterQueryResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SerializedKueryQueryResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SerializedKueryQueryResult> {
    kuery?: KueryResolver<KueryFilterQueryResult | null, TypeParent, Context>;

    serializedQuery?: SerializedQueryResolver<string | null, TypeParent, Context>;
  }

  export type KueryResolver<
    R = KueryFilterQueryResult | null,
    Parent = SerializedKueryQueryResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SerializedQueryResolver<
    R = string | null,
    Parent = SerializedKueryQueryResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace KueryFilterQueryResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = KueryFilterQueryResult> {
    kind?: KindResolver<string | null, TypeParent, Context>;

    expression?: ExpressionResolver<string | null, TypeParent, Context>;
  }

  export type KindResolver<
    R = string | null,
    Parent = KueryFilterQueryResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type ExpressionResolver<
    R = string | null,
    Parent = KueryFilterQueryResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace SortTimelineResultResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = SortTimelineResult> {
    columnId?: ColumnIdResolver<string | null, TypeParent, Context>;

    sortDirection?: SortDirectionResolver<string | null, TypeParent, Context>;
  }

  export type ColumnIdResolver<
    R = string | null,
    Parent = SortTimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type SortDirectionResolver<
    R = string | null,
    Parent = SortTimelineResult,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ResponseTimelinesResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ResponseTimelines> {
    timeline?: TimelineResolver<(TimelineResult | null)[], TypeParent, Context>;

    totalCount?: TotalCountResolver<number | null, TypeParent, Context>;
  }

  export type TimelineResolver<
    R = (TimelineResult | null)[],
    Parent = ResponseTimelines,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TotalCountResolver<
    R = number | null,
    Parent = ResponseTimelines,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace MutationResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = never> {
    /** Persists a note */
    persistNote?: PersistNoteResolver<ResponseNote, TypeParent, Context>;

    deleteNote?: DeleteNoteResolver<boolean | null, TypeParent, Context>;

    deleteNoteByTimelineId?: DeleteNoteByTimelineIdResolver<boolean | null, TypeParent, Context>;
    /** Persists a pinned event in a timeline */
    persistPinnedEventOnTimeline?: PersistPinnedEventOnTimelineResolver<
      PinnedEvent | null,
      TypeParent,
      Context
    >;
    /** Remove a pinned events in a timeline */
    deletePinnedEventOnTimeline?: DeletePinnedEventOnTimelineResolver<boolean, TypeParent, Context>;
    /** Remove all pinned events in a timeline */
    deleteAllPinnedEventsOnTimeline?: DeleteAllPinnedEventsOnTimelineResolver<
      boolean,
      TypeParent,
      Context
    >;
    /** Persists a timeline */
    persistTimeline?: PersistTimelineResolver<ResponseTimeline, TypeParent, Context>;

    persistFavorite?: PersistFavoriteResolver<ResponseFavoriteTimeline, TypeParent, Context>;

    deleteTimeline?: DeleteTimelineResolver<boolean, TypeParent, Context>;
  }

  export type PersistNoteResolver<
    R = ResponseNote,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, PersistNoteArgs>;
  export interface PersistNoteArgs {
    noteId?: string | null;

    version?: string | null;

    note: NoteInput;
  }

  export type DeleteNoteResolver<
    R = boolean | null,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, DeleteNoteArgs>;
  export interface DeleteNoteArgs {
    id: string[];
  }

  export type DeleteNoteByTimelineIdResolver<
    R = boolean | null,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, DeleteNoteByTimelineIdArgs>;
  export interface DeleteNoteByTimelineIdArgs {
    timelineId: string;

    version?: string | null;
  }

  export type PersistPinnedEventOnTimelineResolver<
    R = PinnedEvent | null,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, PersistPinnedEventOnTimelineArgs>;
  export interface PersistPinnedEventOnTimelineArgs {
    pinnedEventId?: string | null;

    eventId: string;

    timelineId?: string | null;
  }

  export type DeletePinnedEventOnTimelineResolver<
    R = boolean,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, DeletePinnedEventOnTimelineArgs>;
  export interface DeletePinnedEventOnTimelineArgs {
    id: string[];
  }

  export type DeleteAllPinnedEventsOnTimelineResolver<
    R = boolean,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, DeleteAllPinnedEventsOnTimelineArgs>;
  export interface DeleteAllPinnedEventsOnTimelineArgs {
    timelineId: string;
  }

  export type PersistTimelineResolver<
    R = ResponseTimeline,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, PersistTimelineArgs>;
  export interface PersistTimelineArgs {
    id?: string | null;

    version?: string | null;

    timeline: TimelineInput;
  }

  export type PersistFavoriteResolver<
    R = ResponseFavoriteTimeline,
    Parent = never,
    Context = SiemContext
  > = Resolver<R, Parent, Context, PersistFavoriteArgs>;
  export interface PersistFavoriteArgs {
    timelineId?: string | null;
  }

  export type DeleteTimelineResolver<R = boolean, Parent = never, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context,
    DeleteTimelineArgs
  >;
  export interface DeleteTimelineArgs {
    id: string[];
  }
}

export namespace ResponseNoteResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ResponseNote> {
    code?: CodeResolver<number | null, TypeParent, Context>;

    message?: MessageResolver<string | null, TypeParent, Context>;

    note?: NoteResolver<NoteResult, TypeParent, Context>;
  }

  export type CodeResolver<
    R = number | null,
    Parent = ResponseNote,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MessageResolver<
    R = string | null,
    Parent = ResponseNote,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NoteResolver<R = NoteResult, Parent = ResponseNote, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
}

export namespace ResponseTimelineResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ResponseTimeline> {
    code?: CodeResolver<number | null, TypeParent, Context>;

    message?: MessageResolver<string | null, TypeParent, Context>;

    timeline?: TimelineResolver<TimelineResult, TypeParent, Context>;
  }

  export type CodeResolver<
    R = number | null,
    Parent = ResponseTimeline,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MessageResolver<
    R = string | null,
    Parent = ResponseTimeline,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TimelineResolver<
    R = TimelineResult,
    Parent = ResponseTimeline,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace ResponseFavoriteTimelineResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = ResponseFavoriteTimeline> {
    savedObjectId?: SavedObjectIdResolver<string, TypeParent, Context>;

    version?: VersionResolver<string, TypeParent, Context>;

    favorite?: FavoriteResolver<FavoriteTimelineResult[] | null, TypeParent, Context>;
  }

  export type SavedObjectIdResolver<
    R = string,
    Parent = ResponseFavoriteTimeline,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string,
    Parent = ResponseFavoriteTimeline,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type FavoriteResolver<
    R = FavoriteTimelineResult[] | null,
    Parent = ResponseFavoriteTimeline,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace OsFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = OsFields> {
    platform?: PlatformResolver<string | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    full?: FullResolver<string | null, TypeParent, Context>;

    family?: FamilyResolver<string | null, TypeParent, Context>;

    version?: VersionResolver<string | null, TypeParent, Context>;

    kernel?: KernelResolver<string | null, TypeParent, Context>;
  }

  export type PlatformResolver<
    R = string | null,
    Parent = OsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<R = string | null, Parent = OsFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FullResolver<R = string | null, Parent = OsFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type FamilyResolver<
    R = string | null,
    Parent = OsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type VersionResolver<
    R = string | null,
    Parent = OsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type KernelResolver<
    R = string | null,
    Parent = OsFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}

export namespace HostFieldsResolvers {
  export interface Resolvers<Context = SiemContext, TypeParent = HostFields> {
    architecture?: ArchitectureResolver<string | null, TypeParent, Context>;

    id?: IdResolver<string | null, TypeParent, Context>;

    ip?: IpResolver<(string | null)[] | null, TypeParent, Context>;

    mac?: MacResolver<(string | null)[] | null, TypeParent, Context>;

    name?: NameResolver<string | null, TypeParent, Context>;

    os?: OsResolver<OsFields | null, TypeParent, Context>;

    type?: TypeResolver<string | null, TypeParent, Context>;
  }

  export type ArchitectureResolver<
    R = string | null,
    Parent = HostFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type IdResolver<R = string | null, Parent = HostFields, Context = SiemContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IpResolver<
    R = (string | null)[] | null,
    Parent = HostFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type MacResolver<
    R = (string | null)[] | null,
    Parent = HostFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type NameResolver<
    R = string | null,
    Parent = HostFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type OsResolver<
    R = OsFields | null,
    Parent = HostFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
  export type TypeResolver<
    R = string | null,
    Parent = HostFields,
    Context = SiemContext
  > = Resolver<R, Parent, Context>;
}
