/* tslint:disable */

// ====================================================
// START: Typescript template
// ====================================================

// ====================================================
// Scalars
// ====================================================

export type UnsignedInteger = any;

// ====================================================
// Types
// ====================================================

export interface Query {
  /** Get a list of all recorded pings for all monitors */
  allPings: PingResults;
  /** Gets the number of documents in the target index */
  getDocCount: DocCount;

  getMonitors?: LatestMonitorsResult | null;

  getSnapshot?: Snapshot | null;

  getSnapshotHistogram: HistogramDataPoint[];

  getMonitorChartsData?: MonitorChart | null;
  /** Fetch the most recent event data for a monitor ID, date range, location. */
  getLatestMonitors: Ping[];

  getMonitorPageTitle?: MonitorPageTitle | null;
  /** Fetches the current state of Uptime monitors for the given parameters. */
  getMonitorStates?: MonitorSummaryResult | null;
  /** Fetches details about the uptime index. */
  getStatesIndexStatus: StatesIndexStatus;
}

export interface PingResults {
  /** Total number of matching pings */
  total: UnsignedInteger;
  /** Unique list of all locations the query matched */
  locations: string[];
  /** List of pings */
  pings: Ping[];
}
/** A request sent from a monitor to a host */
export interface Ping {
  /** unique ID for this ping */
  id: string;
  /** The timestamp of the ping's creation */
  timestamp: string;
  /** The agent that recorded the ping */
  beat?: Beat | null;

  container?: Container | null;

  docker?: Docker | null;

  ecs?: Ecs | null;

  error?: Error | null;

  host?: Host | null;

  http?: Http | null;

  icmp?: Icmp | null;

  kubernetes?: Kubernetes | null;

  meta?: Meta | null;

  monitor?: Monitor | null;

  observer?: Observer | null;

  resolve?: Resolve | null;

  socks5?: Socks5 | null;

  summary?: Summary | null;

  tags?: string | null;

  tcp?: Tcp | null;

  tls?: PingTls | null;

  url?: Url | null;
}
/** An agent for recording a beat */
export interface Beat {
  hostname?: string | null;

  name?: string | null;

  timezone?: string | null;

  type?: string | null;
}

export interface Container {
  id?: string | null;

  image?: ContainerImage | null;

  name?: string | null;

  runtime?: string | null;
}

export interface ContainerImage {
  name?: string | null;

  tag?: string | null;
}

export interface Docker {
  id?: string | null;

  image?: string | null;

  name?: string | null;
}

export interface Ecs {
  version?: string | null;
}

export interface Error {
  code?: number | null;

  message?: string | null;

  type?: string | null;
}

export interface Host {
  architecture?: string | null;

  id?: string | null;

  hostname?: string | null;

  ip?: string | null;

  mac?: string | null;

  name?: string | null;

  os?: Os | null;
}

export interface Os {
  family?: string | null;

  kernel?: string | null;

  platform?: string | null;

  version?: string | null;

  name?: string | null;

  build?: string | null;
}

export interface Http {
  response?: HttpResponse | null;

  rtt?: HttpRtt | null;

  url?: string | null;
}

export interface HttpResponse {
  status_code?: UnsignedInteger | null;

  body?: HttpBody | null;
}

export interface HttpBody {
  /** Size of HTTP response body in bytes */
  bytes?: UnsignedInteger | null;
  /** Hash of the HTTP response body */
  hash?: string | null;
  /** Response body of the HTTP Response. May be truncated based on client settings. */
  content?: string | null;
  /** Byte length of the content string, taking into account multibyte chars. */
  content_bytes?: UnsignedInteger | null;
}

export interface HttpRtt {
  content?: Duration | null;

  response_header?: Duration | null;

  total?: Duration | null;

  validate?: Duration | null;

  validate_body?: Duration | null;

  write_request?: Duration | null;
}
/** The monitor's status for a ping */
export interface Duration {
  us?: UnsignedInteger | null;
}

export interface Icmp {
  requests?: number | null;

  rtt?: number | null;
}

export interface Kubernetes {
  container?: KubernetesContainer | null;

  namespace?: string | null;

  node?: KubernetesNode | null;

  pod?: KubernetesPod | null;
}

export interface KubernetesContainer {
  image?: string | null;

  name?: string | null;
}

export interface KubernetesNode {
  name?: string | null;
}

export interface KubernetesPod {
  name?: string | null;

  uid?: string | null;
}

export interface Meta {
  cloud?: MetaCloud | null;
}

export interface MetaCloud {
  availability_zone?: string | null;

  instance_id?: string | null;

  instance_name?: string | null;

  machine_type?: string | null;

  project_id?: string | null;

  provider?: string | null;

  region?: string | null;
}

export interface Monitor {
  duration?: Duration | null;

  host?: string | null;
  /** The id of the monitor */
  id?: string | null;
  /** The IP pinged by the monitor */
  ip?: string | null;
  /** The name of the protocol being monitored */
  name?: string | null;
  /** The protocol scheme of the monitored host */
  scheme?: string | null;
  /** The status of the monitored host */
  status?: string | null;
  /** The type of host being monitored */
  type?: string | null;

  check_group?: string | null;
}
/** Metadata added by a proccessor, which is specified in its configuration. */
export interface Observer {
  /** Geolocation data for the agent. */
  geo?: Geo | null;
}
/** Geolocation data added via processors to enrich events. */
export interface Geo {
  /** Name of the city in which the agent is running. */
  city_name?: string | null;
  /** The name of the continent on which the agent is running. */
  continent_name?: string | null;
  /** ISO designation for the agent's country. */
  country_iso_code?: string | null;
  /** The name of the agent's country. */
  country_name?: string | null;
  /** The lat/long of the agent. */
  location?: string | null;
  /** A name for the host's location, e.g. 'us-east-1' or 'LAX'. */
  name?: string | null;
  /** ISO designation of the agent's region. */
  region_iso_code?: string | null;
  /** Name of the region hosting the agent. */
  region_name?: string | null;
}

export interface Resolve {
  host?: string | null;

  ip?: string | null;

  rtt?: Duration | null;
}

export interface Socks5 {
  rtt?: Rtt | null;
}

export interface Rtt {
  connect?: Duration | null;

  handshake?: Duration | null;

  validate?: Duration | null;
}

export interface Summary {
  up?: number | null;

  down?: number | null;

  geo?: CheckGeo | null;
}

export interface CheckGeo {
  name?: string | null;

  location?: Location | null;
}

export interface Location {
  lat?: number | null;

  lon?: number | null;
}

export interface Tcp {
  port?: number | null;

  rtt?: Rtt | null;
}
/** Contains monitor transmission encryption information. */
export interface PingTls {
  /** The date and time after which the certificate is invalid. */
  certificate_not_valid_after?: string | null;

  certificate_not_valid_before?: string | null;

  certificates?: string | null;

  rtt?: Rtt | null;
}

export interface Url {
  full?: string | null;

  scheme?: string | null;

  domain?: string | null;

  port?: number | null;

  path?: string | null;

  query?: string | null;
}

export interface DocCount {
  count: UnsignedInteger;
}

export interface LatestMonitorsResult {
  monitors?: LatestMonitor[] | null;
}
/** Represents the latest recorded information about a monitor. */
export interface LatestMonitor {
  /** The ID of the monitor represented by this data. */
  id: MonitorKey;
  /** Information from the latest document. */
  ping?: Ping | null;
  /** Buckets of recent up count status data. */
  upSeries?: MonitorSeriesPoint[] | null;
  /** Buckets of recent down count status data. */
  downSeries?: MonitorSeriesPoint[] | null;
}

export interface MonitorKey {
  key: string;

  url?: string | null;
}

export interface MonitorSeriesPoint {
  x?: UnsignedInteger | null;

  y?: number | null;
}

export interface Snapshot {
  counts: SnapshotCount;
}

export interface SnapshotCount {
  up: number;

  down: number;

  mixed: number;

  total: number;
}

export interface HistogramDataPoint {
  upCount?: number | null;

  downCount?: number | null;

  x?: UnsignedInteger | null;

  x0?: UnsignedInteger | null;

  y?: UnsignedInteger | null;
}
/** The data used to populate the monitor charts. */
export interface MonitorChart {
  /** The average values for the monitor duration. */
  locationDurationLines: LocationDurationLine[];
  /** The counts of up/down checks for the monitor. */
  status: StatusData[];
  /** The maximum status doc count in this chart. */
  statusMaxCount: number;
  /** The maximum duration value in this chart. */
  durationMaxValue: number;
}

export interface LocationDurationLine {
  name: string;

  line: MonitorDurationAveragePoint[];
}
/** Represents the average monitor duration ms at a point in time. */
export interface MonitorDurationAveragePoint {
  /** The timeseries value for this point. */
  x: UnsignedInteger;
  /** The average duration ms for the monitor. */
  y?: number | null;
}
/** Represents a bucket of monitor status information. */
export interface StatusData {
  /** The timeseries point for this status data. */
  x: UnsignedInteger;
  /** The value of up counts for this point. */
  up?: number | null;
  /** The value for down counts for this point. */
  down?: number | null;
  /** The total down counts for this point. */
  total?: number | null;
}

export interface MonitorPageTitle {
  id: string;

  url?: string | null;

  name?: string | null;
}
/** The primary object returned for monitor states. */
export interface MonitorSummaryResult {
  /** Used to go to the next page of results */
  prevPagePagination?: string | null;
  /** Used to go to the previous page of results */
  nextPagePagination?: string | null;
  /** The objects representing the state of a series of heartbeat monitors. */
  summaries?: MonitorSummary[] | null;
  /** The number of summaries. */
  totalSummaryCount: DocCount;
}
/** Represents the current state and associated data for an Uptime monitor. */
export interface MonitorSummary {
  /** The ID assigned by the config or generated by the user. */
  monitor_id: string;
  /** The state of the monitor and its associated details. */
  state: State;

  histogram?: SummaryHistogram | null;
}
/** Unifies the subsequent data for an uptime monitor. */
export interface State {
  /** The agent processing the monitor. */
  agent?: Agent | null;
  /** There is a check object for each instance of the monitoring agent. */
  checks?: Check[] | null;

  geo?: StateGeo | null;

  observer?: StateObserver | null;

  monitor?: MonitorState | null;

  summary: Summary;

  timestamp: UnsignedInteger;
  /** Transport encryption information. */
  tls?: (StateTls | null)[] | null;

  url?: StateUrl | null;
}

export interface Agent {
  id: string;
}

export interface Check {
  agent?: Agent | null;

  container?: StateContainer | null;

  kubernetes?: StateKubernetes | null;

  monitor: CheckMonitor;

  observer?: CheckObserver | null;

  timestamp: string;
}

export interface StateContainer {
  id?: string | null;
}

export interface StateKubernetes {
  pod?: StatePod | null;
}

export interface StatePod {
  uid?: string | null;
}

export interface CheckMonitor {
  ip?: string | null;

  name?: string | null;

  status: string;
}

export interface CheckObserver {
  geo?: CheckGeo | null;
}

export interface StateGeo {
  name?: (string | null)[] | null;

  location?: Location | null;
}

export interface StateObserver {
  geo?: StateGeo | null;
}

export interface MonitorState {
  status?: string | null;

  name?: string | null;

  id?: string | null;

  type?: string | null;
}
/** Contains monitor transmission encryption information. */
export interface StateTls {
  /** The date and time after which the certificate is invalid. */
  certificate_not_valid_after?: string | null;

  certificate_not_valid_before?: string | null;

  certificates?: string | null;

  rtt?: Rtt | null;
}

export interface StateUrl {
  domain?: string | null;

  full?: string | null;

  path?: string | null;

  port?: number | null;

  scheme?: string | null;
}
/** Monitor status data over time. */
export interface SummaryHistogram {
  /** The number of documents used to assemble the histogram. */
  count: number;
  /** The individual histogram data points. */
  points: SummaryHistogramPoint[];
}
/** Represents a monitor's statuses for a period of time. */
export interface SummaryHistogramPoint {
  /** The time at which these data were collected. */
  timestamp: UnsignedInteger;
  /** The number of _up_ documents. */
  up: number;
  /** The number of _down_ documents. */
  down: number;
}
/** Represents the current status of the uptime index. */
export interface StatesIndexStatus {
  /** Flag denoting whether the index exists. */
  indexExists: boolean;
  /** The number of documents in the index. */
  docCount?: DocCount | null;
}

export interface DataPoint {
  x?: UnsignedInteger | null;

  y?: number | null;
}
/** Represents a monitor's duration performance in microseconds at a point in time. */
export interface MonitorDurationAreaPoint {
  /** The timeseries value for this point in time. */
  x: UnsignedInteger;
  /** The min duration value in microseconds at this time. */
  yMin?: number | null;
  /** The max duration value in microseconds at this point. */
  yMax?: number | null;
}

export interface MonitorSummaryUrl {
  domain?: string | null;

  fragment?: string | null;

  full?: string | null;

  original?: string | null;

  password?: string | null;

  path?: string | null;

  port?: number | null;

  query?: string | null;

  scheme?: string | null;

  username?: string | null;
}

// ====================================================
// Arguments
// ====================================================

export interface AllPingsQueryArgs {
  /** Optional: the direction to sort by. Accepts 'asc' and 'desc'. Defaults to 'desc'. */
  sort?: string | null;
  /** Optional: the number of results to return. */
  size?: number | null;
  /** Optional: the monitor ID filter. */
  monitorId?: string | null;
  /** Optional: the check status to filter by. */
  status?: string | null;
  /** The lower limit of the date range. */
  dateRangeStart: string;
  /** The upper limit of the date range. */
  dateRangeEnd: string;
  /** Optional: agent location to filter by. */
  location?: string | null;
}
export interface GetMonitorsQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  filters?: string | null;

  statusFilter?: string | null;
}
export interface GetSnapshotQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  filters?: string | null;

  statusFilter?: string | null;
}
export interface GetSnapshotHistogramQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  filters?: string | null;

  statusFilter?: string | null;

  monitorId?: string | null;
}
export interface GetMonitorChartsDataQueryArgs {
  monitorId: string;

  dateRangeStart: string;

  dateRangeEnd: string;

  location?: string | null;
}
export interface GetLatestMonitorsQueryArgs {
  /** The lower limit of the date range. */
  dateRangeStart: string;
  /** The upper limit of the date range. */
  dateRangeEnd: string;
  /** Optional: a specific monitor ID filter. */
  monitorId?: string | null;
  /** Optional: a specific instance location filter. */
  location?: string | null;
}
export interface GetFilterBarQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;
}
export interface GetMonitorPageTitleQueryArgs {
  monitorId: string;
}
export interface GetMonitorStatesQueryArgs {
  dateRangeStart: string;

  dateRangeEnd: string;

  pagination?: string | null;

  filters?: string | null;

  statusFilter?: string | null;
}

// ====================================================
// Enums
// ====================================================

export enum CursorDirection {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

// ====================================================
// END: Typescript template
// ====================================================
