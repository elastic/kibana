import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string,
  String: string,
  Boolean: boolean,
  Int: number,
  Float: number,
  ToStringArray: any,
  Date: any,
  ToNumberArray: any,
  ToDateArray: any,
  ToBooleanArray: any,
  EsValue: any,
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
  Asc = 'asc',
  Desc = 'desc'
}

export type DomainsData = {
   __typename?: 'DomainsData',
  edges: Array<DomainsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type DomainsEdges = {
   __typename?: 'DomainsEdges',
  node: DomainsNode,
  cursor: CursorType,
};

export enum DomainsFields {
  DomainName = 'domainName',
  Direction = 'direction',
  Bytes = 'bytes',
  Packets = 'packets',
  UniqueIpCount = 'uniqueIpCount'
}

export type DomainsItem = {
   __typename?: 'DomainsItem',
  uniqueIpCount?: Maybe<Scalars['Float']>,
  domainName?: Maybe<Scalars['String']>,
  firstSeen?: Maybe<Scalars['Date']>,
  lastSeen?: Maybe<Scalars['Date']>,
};

export type DomainsNetworkField = {
   __typename?: 'DomainsNetworkField',
  bytes?: Maybe<Scalars['Float']>,
  packets?: Maybe<Scalars['Float']>,
  transport?: Maybe<Scalars['String']>,
  direction?: Maybe<Array<NetworkDirectionEcs>>,
};

export type DomainsNode = {
   __typename?: 'DomainsNode',
  _id?: Maybe<Scalars['String']>,
  timestamp?: Maybe<Scalars['Date']>,
  source?: Maybe<DomainsItem>,
  destination?: Maybe<DomainsItem>,
  client?: Maybe<DomainsItem>,
  server?: Maybe<DomainsItem>,
  network?: Maybe<DomainsNetworkField>,
};

export type DomainsSortField = {
  field: DomainsFields,
  direction: Direction,
};

export type Ecs = {
   __typename?: 'ECS',
  _id: Scalars['String'],
  _index?: Maybe<Scalars['String']>,
  auditd?: Maybe<AuditdEcsFields>,
  destination?: Maybe<DestinationEcsFields>,
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
  process?: Maybe<ProcessEcsFields>,
  file?: Maybe<FileFields>,
  system?: Maybe<SystemEcsField>,
};

export type EcsEdges = {
   __typename?: 'EcsEdges',
  node: Ecs,
  cursor: CursorType,
};


export type EventEcsFields = {
   __typename?: 'EventEcsFields',
  action?: Maybe<Scalars['ToStringArray']>,
  category?: Maybe<Scalars['ToStringArray']>,
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
  UniDirectional = 'uniDirectional',
  BiDirectional = 'biDirectional'
}

export enum FlowTarget {
  Client = 'client',
  Destination = 'destination',
  Server = 'server',
  Source = 'source'
}

export enum FlowTargetNew {
  Destination = 'destination',
  Source = 'source'
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
  flowTarget?: Maybe<FlowTarget>,
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
  HostName = 'hostName',
  LastSeen = 'lastSeen'
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
  HostDetails = 'hostDetails',
  Hosts = 'hosts',
  IpDetails = 'ipDetails',
  Network = 'network'
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

export type MatrixOverTimeHistogramData = {
   __typename?: 'MatrixOverTimeHistogramData',
  x: Scalars['Float'],
  y: Scalars['Float'],
  g: Scalars['String'],
};

export type Mutation = {
   __typename?: 'Mutation',
};

export enum NetworkDirectionEcs {
  Inbound = 'inbound',
  Outbound = 'outbound',
  Internal = 'internal',
  External = 'external',
  Incoming = 'incoming',
  Outgoing = 'outgoing',
  Listening = 'listening',
  Unknown = 'unknown'
}

export type NetworkDnsData = {
   __typename?: 'NetworkDnsData',
  edges: Array<NetworkDnsEdges>,
  totalCount: Scalars['Float'],
  pageInfo: PageInfoPaginated,
  inspect?: Maybe<Inspect>,
};

export type NetworkDnsEdges = {
   __typename?: 'NetworkDnsEdges',
  node: NetworkDnsItem,
  cursor: CursorType,
};

export enum NetworkDnsFields {
  DnsName = 'dnsName',
  QueryCount = 'queryCount',
  UniqueDomains = 'uniqueDomains',
  DnsBytesIn = 'dnsBytesIn',
  DnsBytesOut = 'dnsBytesOut'
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

export enum NetworkTopNFlowFields {
  BytesIn = 'bytes_in',
  BytesOut = 'bytes_out',
  Flows = 'flows',
  DestinationIps = 'destination_ips',
  SourceIps = 'source_ips'
}

export type NetworkTopNFlowItem = {
   __typename?: 'NetworkTopNFlowItem',
  _id?: Maybe<Scalars['String']>,
  source?: Maybe<TopNFlowItemSource>,
  destination?: Maybe<TopNFlowItemDestination>,
  network?: Maybe<TopNFlowNetworkEcsField>,
};

export type NetworkTopNFlowSortField = {
  field: NetworkTopNFlowFields,
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
  pid?: Maybe<Scalars['ToNumberArray']>,
  name?: Maybe<Scalars['ToStringArray']>,
  ppid?: Maybe<Scalars['ToNumberArray']>,
  args?: Maybe<Scalars['ToStringArray']>,
  executable?: Maybe<Scalars['ToStringArray']>,
  title?: Maybe<Scalars['ToStringArray']>,
  thread?: Maybe<Thread>,
  working_directory?: Maybe<Scalars['ToStringArray']>,
};

export type Query = {
   __typename?: 'Query',
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
  UpdatedBy = 'updatedBy',
  Updated = 'updated'
}

export enum SortFieldTimeline {
  Title = 'title',
  Description = 'description',
  Updated = 'updated',
  Created = 'created'
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
  kqlMode?: Maybe<Scalars['String']>,
  kqlQuery?: Maybe<SerializedFilterQueryInput>,
  title?: Maybe<Scalars['String']>,
  dateRange?: Maybe<DateRangePickerInput>,
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
  savedObjectId: Scalars['String'],
  columns?: Maybe<Array<ColumnHeaderResult>>,
  dataProviders?: Maybe<Array<DataProviderResult>>,
  dateRange?: Maybe<DateRangePickerResult>,
  description?: Maybe<Scalars['String']>,
  eventIdToNoteIds?: Maybe<Array<NoteResult>>,
  favorite?: Maybe<Array<FavoriteTimelineResult>>,
  kqlMode?: Maybe<Scalars['String']>,
  kqlQuery?: Maybe<SerializedFilterQueryResult>,
  notes?: Maybe<Array<NoteResult>>,
  noteIds?: Maybe<Array<Scalars['String']>>,
  pinnedEventIds?: Maybe<Array<Scalars['String']>>,
  pinnedEventsSaveObject?: Maybe<Array<PinnedEvent>>,
  title?: Maybe<Scalars['String']>,
  sort?: Maybe<SortTimelineResult>,
  created?: Maybe<Scalars['Float']>,
  createdBy?: Maybe<Scalars['String']>,
  updated?: Maybe<Scalars['Float']>,
  updatedBy?: Maybe<Scalars['String']>,
  version: Scalars['String'],
};

export type TimerangeInput = {
  /** 
 * The interval string to use for last bucket. The format is '{value}{unit}'. For
   * example '5m' would return the metrics for the last 5 minutes of the timespan.
 **/
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
  Id = '_id'
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

export type TopNFlowNetworkEcsField = {
   __typename?: 'TopNFlowNetworkEcsField',
  bytes_in?: Maybe<Scalars['Float']>,
  bytes_out?: Maybe<Scalars['Float']>,
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
  Name = 'name',
  Count = 'count'
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
export type ResolversTypes = {
  Query: ResolverTypeWrapper<{}>,
  Mutation: ResolverTypeWrapper<{}>,
  String: ResolverTypeWrapper<Scalars['String']>,
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>,
  NoteResult: ResolverTypeWrapper<NoteResult>,
  Float: ResolverTypeWrapper<Scalars['Float']>,
  PageInfoNote: PageInfoNote,
  SortNote: SortNote,
  SortFieldNote: SortFieldNote,
  Direction: Direction,
  ResponseNotes: ResolverTypeWrapper<ResponseNotes>,
  PinnedEvent: ResolverTypeWrapper<PinnedEvent>,
  ID: ResolverTypeWrapper<Scalars['ID']>,
  Source: ResolverTypeWrapper<Source>,
  SourceConfiguration: ResolverTypeWrapper<SourceConfiguration>,
  SourceFields: ResolverTypeWrapper<SourceFields>,
  SourceStatus: ResolverTypeWrapper<SourceStatus>,
  IndexField: ResolverTypeWrapper<IndexField>,
  TimerangeInput: TimerangeInput,
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
  Inspect: ResolverTypeWrapper<Inspect>,
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
  ProcessEcsFields: ResolverTypeWrapper<ProcessEcsFields>,
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
  MatrixOverTimeHistogramData: ResolverTypeWrapper<MatrixOverTimeHistogramData>,
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
  DomainsSortField: DomainsSortField,
  DomainsFields: DomainsFields,
  FlowDirection: FlowDirection,
  FlowTarget: FlowTarget,
  DomainsData: ResolverTypeWrapper<DomainsData>,
  DomainsEdges: ResolverTypeWrapper<DomainsEdges>,
  DomainsNode: ResolverTypeWrapper<DomainsNode>,
  DomainsItem: ResolverTypeWrapper<DomainsItem>,
  DomainsNetworkField: ResolverTypeWrapper<DomainsNetworkField>,
  NetworkDirectionEcs: NetworkDirectionEcs,
  TlsSortField: TlsSortField,
  TlsFields: TlsFields,
  TlsData: ResolverTypeWrapper<TlsData>,
  TlsEdges: ResolverTypeWrapper<TlsEdges>,
  TlsNode: ResolverTypeWrapper<TlsNode>,
  UsersSortField: UsersSortField,
  UsersFields: UsersFields,
  UsersData: ResolverTypeWrapper<UsersData>,
  UsersEdges: ResolverTypeWrapper<UsersEdges>,
  UsersNode: ResolverTypeWrapper<UsersNode>,
  UsersItem: ResolverTypeWrapper<UsersItem>,
  KpiNetworkData: ResolverTypeWrapper<KpiNetworkData>,
  KpiNetworkHistogramData: ResolverTypeWrapper<KpiNetworkHistogramData>,
  KpiHostsData: ResolverTypeWrapper<KpiHostsData>,
  KpiHostHistogramData: ResolverTypeWrapper<KpiHostHistogramData>,
  KpiHostDetailsData: ResolverTypeWrapper<KpiHostDetailsData>,
  FlowTargetNew: FlowTargetNew,
  NetworkTopNFlowSortField: NetworkTopNFlowSortField,
  NetworkTopNFlowFields: NetworkTopNFlowFields,
  NetworkTopNFlowData: ResolverTypeWrapper<NetworkTopNFlowData>,
  NetworkTopNFlowEdges: ResolverTypeWrapper<NetworkTopNFlowEdges>,
  NetworkTopNFlowItem: ResolverTypeWrapper<NetworkTopNFlowItem>,
  TopNFlowItemSource: ResolverTypeWrapper<TopNFlowItemSource>,
  AutonomousSystemItem: ResolverTypeWrapper<AutonomousSystemItem>,
  GeoItem: ResolverTypeWrapper<GeoItem>,
  TopNFlowItemDestination: ResolverTypeWrapper<TopNFlowItemDestination>,
  TopNFlowNetworkEcsField: ResolverTypeWrapper<TopNFlowNetworkEcsField>,
  NetworkDnsSortField: NetworkDnsSortField,
  NetworkDnsFields: NetworkDnsFields,
  NetworkDnsData: ResolverTypeWrapper<NetworkDnsData>,
  NetworkDnsEdges: ResolverTypeWrapper<NetworkDnsEdges>,
  NetworkDnsItem: ResolverTypeWrapper<NetworkDnsItem>,
  OverviewNetworkData: ResolverTypeWrapper<OverviewNetworkData>,
  OverviewHostData: ResolverTypeWrapper<OverviewHostData>,
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
  SerializedFilterQueryResult: ResolverTypeWrapper<SerializedFilterQueryResult>,
  SerializedKueryQueryResult: ResolverTypeWrapper<SerializedKueryQueryResult>,
  KueryFilterQueryResult: ResolverTypeWrapper<KueryFilterQueryResult>,
  SortTimelineResult: ResolverTypeWrapper<SortTimelineResult>,
  PageInfoTimeline: PageInfoTimeline,
  SortTimeline: SortTimeline,
  SortFieldTimeline: SortFieldTimeline,
  ResponseTimelines: ResolverTypeWrapper<ResponseTimelines>,
  NoteInput: NoteInput,
  ResponseNote: ResolverTypeWrapper<ResponseNote>,
  TimelineInput: TimelineInput,
  ColumnHeaderInput: ColumnHeaderInput,
  DataProviderInput: DataProviderInput,
  QueryMatchInput: QueryMatchInput,
  SerializedFilterQueryInput: SerializedFilterQueryInput,
  SerializedKueryQueryInput: SerializedKueryQueryInput,
  KueryFilterQueryInput: KueryFilterQueryInput,
  DateRangePickerInput: DateRangePickerInput,
  SortTimelineInput: SortTimelineInput,
  ResponseTimeline: ResolverTypeWrapper<ResponseTimeline>,
  ResponseFavoriteTimeline: ResolverTypeWrapper<ResponseFavoriteTimeline>,
  EcsEdges: ResolverTypeWrapper<EcsEdges>,
  EventsTimelineData: ResolverTypeWrapper<EventsTimelineData>,
  OsFields: ResolverTypeWrapper<OsFields>,
  HostFields: ResolverTypeWrapper<HostFields>,
  FavoriteTimelineInput: FavoriteTimelineInput,
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Query: {},
  Mutation: {},
  String: Scalars['String'],
  Boolean: Scalars['Boolean'],
  NoteResult: NoteResult,
  Float: Scalars['Float'],
  PageInfoNote: PageInfoNote,
  SortNote: SortNote,
  SortFieldNote: SortFieldNote,
  Direction: Direction,
  ResponseNotes: ResponseNotes,
  PinnedEvent: PinnedEvent,
  ID: Scalars['ID'],
  Source: Source,
  SourceConfiguration: SourceConfiguration,
  SourceFields: SourceFields,
  SourceStatus: SourceStatus,
  IndexField: IndexField,
  TimerangeInput: TimerangeInput,
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
  Inspect: Inspect,
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
  ProcessEcsFields: ProcessEcsFields,
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
  MatrixOverTimeHistogramData: MatrixOverTimeHistogramData,
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
  DomainsSortField: DomainsSortField,
  DomainsFields: DomainsFields,
  FlowDirection: FlowDirection,
  FlowTarget: FlowTarget,
  DomainsData: DomainsData,
  DomainsEdges: DomainsEdges,
  DomainsNode: DomainsNode,
  DomainsItem: DomainsItem,
  DomainsNetworkField: DomainsNetworkField,
  NetworkDirectionEcs: NetworkDirectionEcs,
  TlsSortField: TlsSortField,
  TlsFields: TlsFields,
  TlsData: TlsData,
  TlsEdges: TlsEdges,
  TlsNode: TlsNode,
  UsersSortField: UsersSortField,
  UsersFields: UsersFields,
  UsersData: UsersData,
  UsersEdges: UsersEdges,
  UsersNode: UsersNode,
  UsersItem: UsersItem,
  KpiNetworkData: KpiNetworkData,
  KpiNetworkHistogramData: KpiNetworkHistogramData,
  KpiHostsData: KpiHostsData,
  KpiHostHistogramData: KpiHostHistogramData,
  KpiHostDetailsData: KpiHostDetailsData,
  FlowTargetNew: FlowTargetNew,
  NetworkTopNFlowSortField: NetworkTopNFlowSortField,
  NetworkTopNFlowFields: NetworkTopNFlowFields,
  NetworkTopNFlowData: NetworkTopNFlowData,
  NetworkTopNFlowEdges: NetworkTopNFlowEdges,
  NetworkTopNFlowItem: NetworkTopNFlowItem,
  TopNFlowItemSource: TopNFlowItemSource,
  AutonomousSystemItem: AutonomousSystemItem,
  GeoItem: GeoItem,
  TopNFlowItemDestination: TopNFlowItemDestination,
  TopNFlowNetworkEcsField: TopNFlowNetworkEcsField,
  NetworkDnsSortField: NetworkDnsSortField,
  NetworkDnsFields: NetworkDnsFields,
  NetworkDnsData: NetworkDnsData,
  NetworkDnsEdges: NetworkDnsEdges,
  NetworkDnsItem: NetworkDnsItem,
  OverviewNetworkData: OverviewNetworkData,
  OverviewHostData: OverviewHostData,
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
  SerializedFilterQueryResult: SerializedFilterQueryResult,
  SerializedKueryQueryResult: SerializedKueryQueryResult,
  KueryFilterQueryResult: KueryFilterQueryResult,
  SortTimelineResult: SortTimelineResult,
  PageInfoTimeline: PageInfoTimeline,
  SortTimeline: SortTimeline,
  SortFieldTimeline: SortFieldTimeline,
  ResponseTimelines: ResponseTimelines,
  NoteInput: NoteInput,
  ResponseNote: ResponseNote,
  TimelineInput: TimelineInput,
  ColumnHeaderInput: ColumnHeaderInput,
  DataProviderInput: DataProviderInput,
  QueryMatchInput: QueryMatchInput,
  SerializedFilterQueryInput: SerializedFilterQueryInput,
  SerializedKueryQueryInput: SerializedKueryQueryInput,
  KueryFilterQueryInput: KueryFilterQueryInput,
  DateRangePickerInput: DateRangePickerInput,
  SortTimelineInput: SortTimelineInput,
  ResponseTimeline: ResponseTimeline,
  ResponseFavoriteTimeline: ResponseFavoriteTimeline,
  EcsEdges: EcsEdges,
  EventsTimelineData: EventsTimelineData,
  OsFields: OsFields,
  HostFields: HostFields,
  FavoriteTimelineInput: FavoriteTimelineInput,
};

export type AuditdDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuditdData'] = ResolversParentTypes['AuditdData']> = {
  acct?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  terminal?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  op?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type AuditdEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuditdEcsFields'] = ResolversParentTypes['AuditdEcsFields']> = {
  result?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  session?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  data?: Resolver<Maybe<ResolversTypes['AuditdData']>, ParentType, ContextType>,
  summary?: Resolver<Maybe<ResolversTypes['Summary']>, ParentType, ContextType>,
  sequence?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type AuditEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuditEcsFields'] = ResolversParentTypes['AuditEcsFields']> = {
  package?: Resolver<Maybe<ResolversTypes['PackageEcsFields']>, ParentType, ContextType>,
};

export type AuthEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthEcsFields'] = ResolversParentTypes['AuthEcsFields']> = {
  ssh?: Resolver<Maybe<ResolversTypes['SshEcsFields']>, ParentType, ContextType>,
};

export type AuthenticationItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthenticationItem'] = ResolversParentTypes['AuthenticationItem']> = {
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  failures?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  successes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  user?: Resolver<ResolversTypes['UserEcsFields'], ParentType, ContextType>,
  lastSuccess?: Resolver<Maybe<ResolversTypes['LastSourceHost']>, ParentType, ContextType>,
  lastFailure?: Resolver<Maybe<ResolversTypes['LastSourceHost']>, ParentType, ContextType>,
};

export type AuthenticationsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthenticationsData'] = ResolversParentTypes['AuthenticationsData']> = {
  edges?: Resolver<Array<ResolversTypes['AuthenticationsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type AuthenticationsEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthenticationsEdges'] = ResolversParentTypes['AuthenticationsEdges']> = {
  node?: Resolver<ResolversTypes['AuthenticationItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type AutonomousSystemResolvers<ContextType = any, ParentType extends ResolversParentTypes['AutonomousSystem'] = ResolversParentTypes['AutonomousSystem']> = {
  number?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  organization?: Resolver<Maybe<ResolversTypes['AutonomousSystemOrganization']>, ParentType, ContextType>,
};

export type AutonomousSystemItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['AutonomousSystemItem'] = ResolversParentTypes['AutonomousSystemItem']> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  number?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type AutonomousSystemOrganizationResolvers<ContextType = any, ParentType extends ResolversParentTypes['AutonomousSystemOrganization'] = ResolversParentTypes['AutonomousSystemOrganization']> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type CloudFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['CloudFields'] = ResolversParentTypes['CloudFields']> = {
  instance?: Resolver<Maybe<ResolversTypes['CloudInstance']>, ParentType, ContextType>,
  machine?: Resolver<Maybe<ResolversTypes['CloudMachine']>, ParentType, ContextType>,
  provider?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
  region?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
};

export type CloudInstanceResolvers<ContextType = any, ParentType extends ResolversParentTypes['CloudInstance'] = ResolversParentTypes['CloudInstance']> = {
  id?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
};

export type CloudMachineResolvers<ContextType = any, ParentType extends ResolversParentTypes['CloudMachine'] = ResolversParentTypes['CloudMachine']> = {
  type?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
};

export type ColumnHeaderResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['ColumnHeaderResult'] = ResolversParentTypes['ColumnHeaderResult']> = {
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
};

export type CursorTypeResolvers<ContextType = any, ParentType extends ResolversParentTypes['CursorType'] = ResolversParentTypes['CursorType']> = {
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  tiebreaker?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type DataProviderResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['DataProviderResult'] = ResolversParentTypes['DataProviderResult']> = {
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  enabled?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  excluded?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
  kqlQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  queryMatch?: Resolver<Maybe<ResolversTypes['QueryMatchResult']>, ParentType, ContextType>,
  and?: Resolver<Maybe<Array<ResolversTypes['DataProviderResult']>>, ParentType, ContextType>,
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date'
}

export type DateRangePickerResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['DateRangePickerResult'] = ResolversParentTypes['DateRangePickerResult']> = {
  start?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  end?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type DestinationEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['DestinationEcsFields'] = ResolversParentTypes['DestinationEcsFields']> = {
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  port?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type DetailItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['DetailItem'] = ResolversParentTypes['DetailItem']> = {
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  values?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  originalValue?: Resolver<Maybe<ResolversTypes['EsValue']>, ParentType, ContextType>,
};

export type DomainsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['DomainsData'] = ResolversParentTypes['DomainsData']> = {
  edges?: Resolver<Array<ResolversTypes['DomainsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type DomainsEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['DomainsEdges'] = ResolversParentTypes['DomainsEdges']> = {
  node?: Resolver<ResolversTypes['DomainsNode'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type DomainsItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['DomainsItem'] = ResolversParentTypes['DomainsItem']> = {
  uniqueIpCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  domainName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  firstSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
};

export type DomainsNetworkFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['DomainsNetworkField'] = ResolversParentTypes['DomainsNetworkField']> = {
  bytes?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  transport?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  direction?: Resolver<Maybe<Array<ResolversTypes['NetworkDirectionEcs']>>, ParentType, ContextType>,
};

export type DomainsNodeResolvers<ContextType = any, ParentType extends ResolversParentTypes['DomainsNode'] = ResolversParentTypes['DomainsNode']> = {
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['DomainsItem']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['DomainsItem']>, ParentType, ContextType>,
  client?: Resolver<Maybe<ResolversTypes['DomainsItem']>, ParentType, ContextType>,
  server?: Resolver<Maybe<ResolversTypes['DomainsItem']>, ParentType, ContextType>,
  network?: Resolver<Maybe<ResolversTypes['DomainsNetworkField']>, ParentType, ContextType>,
};

export type EcsResolvers<ContextType = any, ParentType extends ResolversParentTypes['ECS'] = ResolversParentTypes['ECS']> = {
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  _index?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  auditd?: Resolver<Maybe<ResolversTypes['AuditdEcsFields']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['DestinationEcsFields']>, ParentType, ContextType>,
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
  process?: Resolver<Maybe<ResolversTypes['ProcessEcsFields']>, ParentType, ContextType>,
  file?: Resolver<Maybe<ResolversTypes['FileFields']>, ParentType, ContextType>,
  system?: Resolver<Maybe<ResolversTypes['SystemEcsField']>, ParentType, ContextType>,
};

export type EcsEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['EcsEdges'] = ResolversParentTypes['EcsEdges']> = {
  node?: Resolver<ResolversTypes['ECS'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export interface EsValueScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['EsValue'], any> {
  name: 'EsValue'
}

export type EventEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['EventEcsFields'] = ResolversParentTypes['EventEcsFields']> = {
  action?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  category?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
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
};

export type EventsOverTimeDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['EventsOverTimeData'] = ResolversParentTypes['EventsOverTimeData']> = {
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  eventsOverTime?: Resolver<Array<ResolversTypes['MatrixOverTimeHistogramData']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
};

export type EventsTimelineDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['EventsTimelineData'] = ResolversParentTypes['EventsTimelineData']> = {
  edges?: Resolver<Array<ResolversTypes['EcsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type FavoriteTimelineResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['FavoriteTimelineResult'] = ResolversParentTypes['FavoriteTimelineResult']> = {
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  userName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  favoriteDate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type FileFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['FileFields'] = ResolversParentTypes['FileFields']> = {
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
};

export type FingerprintDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['FingerprintData'] = ResolversParentTypes['FingerprintData']> = {
  sha1?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type FirstLastSeenHostResolvers<ContextType = any, ParentType extends ResolversParentTypes['FirstLastSeenHost'] = ResolversParentTypes['FirstLastSeenHost']> = {
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
  firstSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
};

export type GeoEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['GeoEcsFields'] = ResolversParentTypes['GeoEcsFields']> = {
  city_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  continent_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  country_iso_code?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  country_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['Location']>, ParentType, ContextType>,
  region_iso_code?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  region_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type GeoItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['GeoItem'] = ResolversParentTypes['GeoItem']> = {
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  flowTarget?: Resolver<Maybe<ResolversTypes['FlowTarget']>, ParentType, ContextType>,
};

export type HostEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostEcsFields'] = ResolversParentTypes['HostEcsFields']> = {
  architecture?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  mac?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  os?: Resolver<Maybe<ResolversTypes['OsEcsFields']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type HostFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostFields'] = ResolversParentTypes['HostFields']> = {
  architecture?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
  mac?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  os?: Resolver<Maybe<ResolversTypes['OsFields']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type HostItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostItem'] = ResolversParentTypes['HostItem']> = {
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  host?: Resolver<Maybe<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
  cloud?: Resolver<Maybe<ResolversTypes['CloudFields']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type HostsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostsData'] = ResolversParentTypes['HostsData']> = {
  edges?: Resolver<Array<ResolversTypes['HostsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type HostsEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostsEdges'] = ResolversParentTypes['HostsEdges']> = {
  node?: Resolver<ResolversTypes['HostItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type HttpBodyDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['HttpBodyData'] = ResolversParentTypes['HttpBodyData']> = {
  content?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type HttpEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['HttpEcsFields'] = ResolversParentTypes['HttpEcsFields']> = {
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  request?: Resolver<Maybe<ResolversTypes['HttpRequestData']>, ParentType, ContextType>,
  response?: Resolver<Maybe<ResolversTypes['HttpResponseData']>, ParentType, ContextType>,
};

export type HttpRequestDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['HttpRequestData'] = ResolversParentTypes['HttpRequestData']> = {
  method?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  body?: Resolver<Maybe<ResolversTypes['HttpBodyData']>, ParentType, ContextType>,
  referrer?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type HttpResponseDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['HttpResponseData'] = ResolversParentTypes['HttpResponseData']> = {
  status_code?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  body?: Resolver<Maybe<ResolversTypes['HttpBodyData']>, ParentType, ContextType>,
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type IndexFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['IndexField'] = ResolversParentTypes['IndexField']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  example?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  indexes?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>,
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  searchable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>,
  aggregatable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>,
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  format?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type InspectResolvers<ContextType = any, ParentType extends ResolversParentTypes['Inspect'] = ResolversParentTypes['Inspect']> = {
  dsl?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
  response?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
};

export type IpOverviewDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['IpOverviewData'] = ResolversParentTypes['IpOverviewData']> = {
  client?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  host?: Resolver<ResolversTypes['HostEcsFields'], ParentType, ContextType>,
  server?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['Overview']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type KpiHostDetailsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['KpiHostDetailsData'] = ResolversParentTypes['KpiHostDetailsData']> = {
  authSuccess?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  authSuccessHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  authFailure?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  authFailureHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  uniqueSourceIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourceIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  uniqueDestinationIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDestinationIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiHostHistogramData']>>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type KpiHostHistogramDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['KpiHostHistogramData'] = ResolversParentTypes['KpiHostHistogramData']> = {
  x?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  y?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type KpiHostsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['KpiHostsData'] = ResolversParentTypes['KpiHostsData']> = {
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
};

export type KpiNetworkDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['KpiNetworkData'] = ResolversParentTypes['KpiNetworkData']> = {
  networkEvents?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueFlowId?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourcePrivateIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueSourcePrivateIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiNetworkHistogramData']>>, ParentType, ContextType>,
  uniqueDestinationPrivateIps?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDestinationPrivateIpsHistogram?: Resolver<Maybe<Array<ResolversTypes['KpiNetworkHistogramData']>>, ParentType, ContextType>,
  dnsQueries?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  tlsHandshakes?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type KpiNetworkHistogramDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['KpiNetworkHistogramData'] = ResolversParentTypes['KpiNetworkHistogramData']> = {
  x?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  y?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type KueryFilterQueryResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['KueryFilterQueryResult'] = ResolversParentTypes['KueryFilterQueryResult']> = {
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  expression?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type LastEventTimeDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['LastEventTimeData'] = ResolversParentTypes['LastEventTimeData']> = {
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type LastSourceHostResolvers<ContextType = any, ParentType extends ResolversParentTypes['LastSourceHost'] = ResolversParentTypes['LastSourceHost']> = {
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['SourceEcsFields']>, ParentType, ContextType>,
  host?: Resolver<Maybe<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
};

export type LocationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  lon?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  lat?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type MatrixOverTimeHistogramDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['MatrixOverTimeHistogramData'] = ResolversParentTypes['MatrixOverTimeHistogramData']> = {
  x?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  y?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  g?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {};

export type NetworkDnsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkDnsData'] = ResolversParentTypes['NetworkDnsData']> = {
  edges?: Resolver<Array<ResolversTypes['NetworkDnsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type NetworkDnsEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkDnsEdges'] = ResolversParentTypes['NetworkDnsEdges']> = {
  node?: Resolver<ResolversTypes['NetworkDnsItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type NetworkDnsItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkDnsItem'] = ResolversParentTypes['NetworkDnsItem']> = {
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  dnsBytesIn?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  dnsBytesOut?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  dnsName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  queryCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  uniqueDomains?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type NetworkEcsFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkEcsField'] = ResolversParentTypes['NetworkEcsField']> = {
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  community_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  direction?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  protocol?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  transport?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type NetworkTopNFlowDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkTopNFlowData'] = ResolversParentTypes['NetworkTopNFlowData']> = {
  edges?: Resolver<Array<ResolversTypes['NetworkTopNFlowEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type NetworkTopNFlowEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkTopNFlowEdges'] = ResolversParentTypes['NetworkTopNFlowEdges']> = {
  node?: Resolver<ResolversTypes['NetworkTopNFlowItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type NetworkTopNFlowItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkTopNFlowItem'] = ResolversParentTypes['NetworkTopNFlowItem']> = {
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  source?: Resolver<Maybe<ResolversTypes['TopNFlowItemSource']>, ParentType, ContextType>,
  destination?: Resolver<Maybe<ResolversTypes['TopNFlowItemDestination']>, ParentType, ContextType>,
  network?: Resolver<Maybe<ResolversTypes['TopNFlowNetworkEcsField']>, ParentType, ContextType>,
};

export type NoteResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['NoteResult'] = ResolversParentTypes['NoteResult']> = {
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
};

export type OsEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['OsEcsFields'] = ResolversParentTypes['OsEcsFields']> = {
  platform?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  full?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  family?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  kernel?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type OsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['OsFields'] = ResolversParentTypes['OsFields']> = {
  platform?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  full?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  family?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  kernel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type OverviewResolvers<ContextType = any, ParentType extends ResolversParentTypes['Overview'] = ResolversParentTypes['Overview']> = {
  firstSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  lastSeen?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  autonomousSystem?: Resolver<ResolversTypes['AutonomousSystem'], ParentType, ContextType>,
  geo?: Resolver<ResolversTypes['GeoEcsFields'], ParentType, ContextType>,
};

export type OverviewHostDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['OverviewHostData'] = ResolversParentTypes['OverviewHostData']> = {
  auditbeatAuditd?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatFIM?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatLogin?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatPackage?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatProcess?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  auditbeatUser?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  filebeatSystemModule?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  winlogbeat?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type OverviewNetworkDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['OverviewNetworkData'] = ResolversParentTypes['OverviewNetworkData']> = {
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
};

export type PackageEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['PackageEcsFields'] = ResolversParentTypes['PackageEcsFields']> = {
  arch?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  entity_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  size?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  summary?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type PageInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['CursorType']>, ParentType, ContextType>,
  hasNextPage?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>,
};

export type PageInfoPaginatedResolvers<ContextType = any, ParentType extends ResolversParentTypes['PageInfoPaginated'] = ResolversParentTypes['PageInfoPaginated']> = {
  activePage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  fakeTotalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  showMorePagesIndicator?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>,
};

export type PinnedEventResolvers<ContextType = any, ParentType extends ResolversParentTypes['PinnedEvent'] = ResolversParentTypes['PinnedEvent']> = {
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
};

export type PrimarySecondaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['PrimarySecondary'] = ResolversParentTypes['PrimarySecondary']> = {
  primary?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  secondary?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type ProcessEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['ProcessEcsFields'] = ResolversParentTypes['ProcessEcsFields']> = {
  pid?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  ppid?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  args?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  executable?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  title?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  thread?: Resolver<Maybe<ResolversTypes['Thread']>, ParentType, ContextType>,
  working_directory?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {};

export type QueryMatchResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['QueryMatchResult'] = ResolversParentTypes['QueryMatchResult']> = {
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  displayField?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  displayValue?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  operator?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type ResponseFavoriteTimelineResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResponseFavoriteTimeline'] = ResolversParentTypes['ResponseFavoriteTimeline']> = {
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  savedObjectId?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  favorite?: Resolver<Maybe<Array<ResolversTypes['FavoriteTimelineResult']>>, ParentType, ContextType>,
};

export type ResponseNoteResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResponseNote'] = ResolversParentTypes['ResponseNote']> = {
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  note?: Resolver<ResolversTypes['NoteResult'], ParentType, ContextType>,
};

export type ResponseNotesResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResponseNotes'] = ResolversParentTypes['ResponseNotes']> = {
  notes?: Resolver<Array<ResolversTypes['NoteResult']>, ParentType, ContextType>,
  totalCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type ResponseTimelineResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResponseTimeline'] = ResolversParentTypes['ResponseTimeline']> = {
  code?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timeline?: Resolver<ResolversTypes['TimelineResult'], ParentType, ContextType>,
};

export type ResponseTimelinesResolvers<ContextType = any, ParentType extends ResolversParentTypes['ResponseTimelines'] = ResolversParentTypes['ResponseTimelines']> = {
  timeline?: Resolver<Array<Maybe<ResolversTypes['TimelineResult']>>, ParentType, ContextType>,
  totalCount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type SayMyNameResolvers<ContextType = any, ParentType extends ResolversParentTypes['SayMyName'] = ResolversParentTypes['SayMyName']> = {
  appName?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
};

export type SerializedFilterQueryResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SerializedFilterQueryResult'] = ResolversParentTypes['SerializedFilterQueryResult']> = {
  filterQuery?: Resolver<Maybe<ResolversTypes['SerializedKueryQueryResult']>, ParentType, ContextType>,
};

export type SerializedKueryQueryResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SerializedKueryQueryResult'] = ResolversParentTypes['SerializedKueryQueryResult']> = {
  kuery?: Resolver<Maybe<ResolversTypes['KueryFilterQueryResult']>, ParentType, ContextType>,
  serializedQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type SortTimelineResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['SortTimelineResult'] = ResolversParentTypes['SortTimelineResult']> = {
  columnId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  sortDirection?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
};

export type SourceResolvers<ContextType = any, ParentType extends ResolversParentTypes['Source'] = ResolversParentTypes['Source']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>,
  configuration?: Resolver<ResolversTypes['SourceConfiguration'], ParentType, ContextType>,
  status?: Resolver<ResolversTypes['SourceStatus'], ParentType, ContextType>,
};

export type SourceConfigurationResolvers<ContextType = any, ParentType extends ResolversParentTypes['SourceConfiguration'] = ResolversParentTypes['SourceConfiguration']> = {
  fields?: Resolver<ResolversTypes['SourceFields'], ParentType, ContextType>,
};

export type SourceEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['SourceEcsFields'] = ResolversParentTypes['SourceEcsFields']> = {
  bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  port?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  geo?: Resolver<Maybe<ResolversTypes['GeoEcsFields']>, ParentType, ContextType>,
  packets?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type SourceFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['SourceFields'] = ResolversParentTypes['SourceFields']> = {
  container?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  host?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  message?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>,
  pod?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  tiebreaker?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
};

export type SourceStatusResolvers<ContextType = any, ParentType extends ResolversParentTypes['SourceStatus'] = ResolversParentTypes['SourceStatus']> = {};

export type SshEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['SshEcsFields'] = ResolversParentTypes['SshEcsFields']> = {
  method?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  signature?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type SummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Summary'] = ResolversParentTypes['Summary']> = {
  actor?: Resolver<Maybe<ResolversTypes['PrimarySecondary']>, ParentType, ContextType>,
  object?: Resolver<Maybe<ResolversTypes['PrimarySecondary']>, ParentType, ContextType>,
  how?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  message_type?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  sequence?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type SuricataAlertDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['SuricataAlertData'] = ResolversParentTypes['SuricataAlertData']> = {
  signature?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  signature_id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
};

export type SuricataEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['SuricataEcsFields'] = ResolversParentTypes['SuricataEcsFields']> = {
  eve?: Resolver<Maybe<ResolversTypes['SuricataEveData']>, ParentType, ContextType>,
};

export type SuricataEveDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['SuricataEveData'] = ResolversParentTypes['SuricataEveData']> = {
  alert?: Resolver<Maybe<ResolversTypes['SuricataAlertData']>, ParentType, ContextType>,
  flow_id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  proto?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type SystemEcsFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['SystemEcsField'] = ResolversParentTypes['SystemEcsField']> = {
  audit?: Resolver<Maybe<ResolversTypes['AuditEcsFields']>, ParentType, ContextType>,
  auth?: Resolver<Maybe<ResolversTypes['AuthEcsFields']>, ParentType, ContextType>,
};

export type ThreadResolvers<ContextType = any, ParentType extends ResolversParentTypes['Thread'] = ResolversParentTypes['Thread']> = {
  id?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  start?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type TimelineDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimelineData'] = ResolversParentTypes['TimelineData']> = {
  edges?: Resolver<Array<ResolversTypes['TimelineEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type TimelineDetailsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimelineDetailsData'] = ResolversParentTypes['TimelineDetailsData']> = {
  data?: Resolver<Maybe<Array<ResolversTypes['DetailItem']>>, ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type TimelineEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimelineEdges'] = ResolversParentTypes['TimelineEdges']> = {
  node?: Resolver<ResolversTypes['TimelineItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type TimelineItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimelineItem'] = ResolversParentTypes['TimelineItem']> = {
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  _index?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  data?: Resolver<Array<ResolversTypes['TimelineNonEcsData']>, ParentType, ContextType>,
  ecs?: Resolver<ResolversTypes['ECS'], ParentType, ContextType>,
};

export type TimelineNonEcsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimelineNonEcsData'] = ResolversParentTypes['TimelineNonEcsData']> = {
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  value?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type TimelineResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimelineResult'] = ResolversParentTypes['TimelineResult']> = {
  savedObjectId?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  columns?: Resolver<Maybe<Array<ResolversTypes['ColumnHeaderResult']>>, ParentType, ContextType>,
  dataProviders?: Resolver<Maybe<Array<ResolversTypes['DataProviderResult']>>, ParentType, ContextType>,
  dateRange?: Resolver<Maybe<ResolversTypes['DateRangePickerResult']>, ParentType, ContextType>,
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  eventIdToNoteIds?: Resolver<Maybe<Array<ResolversTypes['NoteResult']>>, ParentType, ContextType>,
  favorite?: Resolver<Maybe<Array<ResolversTypes['FavoriteTimelineResult']>>, ParentType, ContextType>,
  kqlMode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  kqlQuery?: Resolver<Maybe<ResolversTypes['SerializedFilterQueryResult']>, ParentType, ContextType>,
  notes?: Resolver<Maybe<Array<ResolversTypes['NoteResult']>>, ParentType, ContextType>,
  noteIds?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  pinnedEventIds?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  pinnedEventsSaveObject?: Resolver<Maybe<Array<ResolversTypes['PinnedEvent']>>, ParentType, ContextType>,
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  sort?: Resolver<Maybe<ResolversTypes['SortTimelineResult']>, ParentType, ContextType>,
  created?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  updated?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  updatedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
};

export type TlsClientCertificateDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsClientCertificateData'] = ResolversParentTypes['TlsClientCertificateData']> = {
  fingerprint?: Resolver<Maybe<ResolversTypes['FingerprintData']>, ParentType, ContextType>,
};

export type TlsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsData'] = ResolversParentTypes['TlsData']> = {
  edges?: Resolver<Array<ResolversTypes['TlsEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type TlsEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsEcsFields'] = ResolversParentTypes['TlsEcsFields']> = {
  client_certificate?: Resolver<Maybe<ResolversTypes['TlsClientCertificateData']>, ParentType, ContextType>,
  fingerprints?: Resolver<Maybe<ResolversTypes['TlsFingerprintsData']>, ParentType, ContextType>,
  server_certificate?: Resolver<Maybe<ResolversTypes['TlsServerCertificateData']>, ParentType, ContextType>,
};

export type TlsEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsEdges'] = ResolversParentTypes['TlsEdges']> = {
  node?: Resolver<ResolversTypes['TlsNode'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type TlsFingerprintsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsFingerprintsData'] = ResolversParentTypes['TlsFingerprintsData']> = {
  ja3?: Resolver<Maybe<ResolversTypes['TlsJa3Data']>, ParentType, ContextType>,
};

export type TlsJa3DataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsJa3Data'] = ResolversParentTypes['TlsJa3Data']> = {
  hash?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type TlsNodeResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsNode'] = ResolversParentTypes['TlsNode']> = {
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  alternativeNames?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  notAfter?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  commonNames?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  ja3?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  issuerNames?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
};

export type TlsServerCertificateDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['TlsServerCertificateData'] = ResolversParentTypes['TlsServerCertificateData']> = {
  fingerprint?: Resolver<Maybe<ResolversTypes['FingerprintData']>, ParentType, ContextType>,
};

export interface ToBooleanArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToBooleanArray'], any> {
  name: 'ToBooleanArray'
}

export interface ToDateArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToDateArray'], any> {
  name: 'ToDateArray'
}

export interface ToNumberArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToNumberArray'], any> {
  name: 'ToNumberArray'
}

export type TopNFlowItemDestinationResolvers<ContextType = any, ParentType extends ResolversParentTypes['TopNFlowItemDestination'] = ResolversParentTypes['TopNFlowItemDestination']> = {
  autonomous_system?: Resolver<Maybe<ResolversTypes['AutonomousSystemItem']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['GeoItem']>, ParentType, ContextType>,
  flows?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  source_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type TopNFlowItemSourceResolvers<ContextType = any, ParentType extends ResolversParentTypes['TopNFlowItemSource'] = ResolversParentTypes['TopNFlowItemSource']> = {
  autonomous_system?: Resolver<Maybe<ResolversTypes['AutonomousSystemItem']>, ParentType, ContextType>,
  domain?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>,
  ip?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  location?: Resolver<Maybe<ResolversTypes['GeoItem']>, ParentType, ContextType>,
  flows?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  destination_ips?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type TopNFlowNetworkEcsFieldResolvers<ContextType = any, ParentType extends ResolversParentTypes['TopNFlowNetworkEcsField'] = ResolversParentTypes['TopNFlowNetworkEcsField']> = {
  bytes_in?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
  bytes_out?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export interface ToStringArrayScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ToStringArray'], any> {
  name: 'ToStringArray'
}

export type UncommonProcessesDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['UncommonProcessesData'] = ResolversParentTypes['UncommonProcessesData']> = {
  edges?: Resolver<Array<ResolversTypes['UncommonProcessesEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type UncommonProcessesEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['UncommonProcessesEdges'] = ResolversParentTypes['UncommonProcessesEdges']> = {
  node?: Resolver<ResolversTypes['UncommonProcessItem'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type UncommonProcessItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['UncommonProcessItem'] = ResolversParentTypes['UncommonProcessItem']> = {
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>,
  instances?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  process?: Resolver<ResolversTypes['ProcessEcsFields'], ParentType, ContextType>,
  hosts?: Resolver<Array<ResolversTypes['HostEcsFields']>, ParentType, ContextType>,
  user?: Resolver<Maybe<ResolversTypes['UserEcsFields']>, ParentType, ContextType>,
};

export type UrlEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['UrlEcsFields'] = ResolversParentTypes['UrlEcsFields']> = {
  domain?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  original?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  username?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  password?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type UserEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['UserEcsFields'] = ResolversParentTypes['UserEcsFields']> = {
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  full_name?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  email?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  hash?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  group?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type UsersDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['UsersData'] = ResolversParentTypes['UsersData']> = {
  edges?: Resolver<Array<ResolversTypes['UsersEdges']>, ParentType, ContextType>,
  totalCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>,
  pageInfo?: Resolver<ResolversTypes['PageInfoPaginated'], ParentType, ContextType>,
  inspect?: Resolver<Maybe<ResolversTypes['Inspect']>, ParentType, ContextType>,
};

export type UsersEdgesResolvers<ContextType = any, ParentType extends ResolversParentTypes['UsersEdges'] = ResolversParentTypes['UsersEdges']> = {
  node?: Resolver<ResolversTypes['UsersNode'], ParentType, ContextType>,
  cursor?: Resolver<ResolversTypes['CursorType'], ParentType, ContextType>,
};

export type UsersItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['UsersItem'] = ResolversParentTypes['UsersItem']> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  groupId?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  groupName?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  count?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>,
};

export type UsersNodeResolvers<ContextType = any, ParentType extends ResolversParentTypes['UsersNode'] = ResolversParentTypes['UsersNode']> = {
  _id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>,
  timestamp?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>,
  user?: Resolver<Maybe<ResolversTypes['UsersItem']>, ParentType, ContextType>,
};

export type ZeekConnectionDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekConnectionData'] = ResolversParentTypes['ZeekConnectionData']> = {
  local_resp?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  local_orig?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  missed_bytes?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  state?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  history?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type ZeekDnsDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekDnsData'] = ResolversParentTypes['ZeekDnsData']> = {
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
};

export type ZeekEcsFieldsResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekEcsFields'] = ResolversParentTypes['ZeekEcsFields']> = {
  session_id?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  connection?: Resolver<Maybe<ResolversTypes['ZeekConnectionData']>, ParentType, ContextType>,
  notice?: Resolver<Maybe<ResolversTypes['ZeekNoticeData']>, ParentType, ContextType>,
  dns?: Resolver<Maybe<ResolversTypes['ZeekDnsData']>, ParentType, ContextType>,
  http?: Resolver<Maybe<ResolversTypes['ZeekHttpData']>, ParentType, ContextType>,
  files?: Resolver<Maybe<ResolversTypes['ZeekFileData']>, ParentType, ContextType>,
  ssl?: Resolver<Maybe<ResolversTypes['ZeekSslData']>, ParentType, ContextType>,
};

export type ZeekFileDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekFileData'] = ResolversParentTypes['ZeekFileData']> = {
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
};

export type ZeekHttpDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekHttpData'] = ResolversParentTypes['ZeekHttpData']> = {
  resp_mime_types?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  trans_depth?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  status_msg?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  resp_fuids?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  tags?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type ZeekNoticeDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekNoticeData'] = ResolversParentTypes['ZeekNoticeData']> = {
  suppress_for?: Resolver<Maybe<ResolversTypes['ToNumberArray']>, ParentType, ContextType>,
  msg?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  note?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  sub?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  dst?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  dropped?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  peer_descr?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type ZeekSslDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['ZeekSslData'] = ResolversParentTypes['ZeekSslData']> = {
  cipher?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
  established?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  resumed?: Resolver<Maybe<ResolversTypes['ToBooleanArray']>, ParentType, ContextType>,
  version?: Resolver<Maybe<ResolversTypes['ToStringArray']>, ParentType, ContextType>,
};

export type Resolvers<ContextType = any> = {
  AuditdData?: AuditdDataResolvers<ContextType>,
  AuditdEcsFields?: AuditdEcsFieldsResolvers<ContextType>,
  AuditEcsFields?: AuditEcsFieldsResolvers<ContextType>,
  AuthEcsFields?: AuthEcsFieldsResolvers<ContextType>,
  AuthenticationItem?: AuthenticationItemResolvers<ContextType>,
  AuthenticationsData?: AuthenticationsDataResolvers<ContextType>,
  AuthenticationsEdges?: AuthenticationsEdgesResolvers<ContextType>,
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
  DomainsData?: DomainsDataResolvers<ContextType>,
  DomainsEdges?: DomainsEdgesResolvers<ContextType>,
  DomainsItem?: DomainsItemResolvers<ContextType>,
  DomainsNetworkField?: DomainsNetworkFieldResolvers<ContextType>,
  DomainsNode?: DomainsNodeResolvers<ContextType>,
  ECS?: EcsResolvers<ContextType>,
  EcsEdges?: EcsEdgesResolvers<ContextType>,
  EsValue?: GraphQLScalarType,
  EventEcsFields?: EventEcsFieldsResolvers<ContextType>,
  EventsOverTimeData?: EventsOverTimeDataResolvers<ContextType>,
  EventsTimelineData?: EventsTimelineDataResolvers<ContextType>,
  FavoriteTimelineResult?: FavoriteTimelineResultResolvers<ContextType>,
  FileFields?: FileFieldsResolvers<ContextType>,
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
  MatrixOverTimeHistogramData?: MatrixOverTimeHistogramDataResolvers<ContextType>,
  Mutation?: MutationResolvers<ContextType>,
  NetworkDnsData?: NetworkDnsDataResolvers<ContextType>,
  NetworkDnsEdges?: NetworkDnsEdgesResolvers<ContextType>,
  NetworkDnsItem?: NetworkDnsItemResolvers<ContextType>,
  NetworkEcsField?: NetworkEcsFieldResolvers<ContextType>,
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
  TopNFlowItemDestination?: TopNFlowItemDestinationResolvers<ContextType>,
  TopNFlowItemSource?: TopNFlowItemSourceResolvers<ContextType>,
  TopNFlowNetworkEcsField?: TopNFlowNetworkEcsFieldResolvers<ContextType>,
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
  ZeekConnectionData?: ZeekConnectionDataResolvers<ContextType>,
  ZeekDnsData?: ZeekDnsDataResolvers<ContextType>,
  ZeekEcsFields?: ZeekEcsFieldsResolvers<ContextType>,
  ZeekFileData?: ZeekFileDataResolvers<ContextType>,
  ZeekHttpData?: ZeekHttpDataResolvers<ContextType>,
  ZeekNoticeData?: ZeekNoticeDataResolvers<ContextType>,
  ZeekSslData?: ZeekSslDataResolvers<ContextType>,
};


/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
*/
export type IResolvers<ContextType = any> = Resolvers<ContextType>;
