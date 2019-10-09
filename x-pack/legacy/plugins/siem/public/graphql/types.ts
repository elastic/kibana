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

