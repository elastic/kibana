/* tslint:disable */
import { InfraContext } from '../lib/infra_types';
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
// Types
// ====================================================

export interface Query {
  /** Get an infrastructure data source by id.The resolution order for the source configuration attributes is as followswith the first defined value winning:1. The attributes of the saved object with the given 'id'.2. The attributes defined in the static Kibana configuration key'xpack.infra.sources.default'.3. The hard-coded default values.As a consequence, querying a source that doesn't exist doesn't error out,but returns the configured or hardcoded defaults. */
  source: InfraSource;
  /** Get a list of all infrastructure data sources */
  allSources: InfraSource[];
}
/** A source of infrastructure data */
export interface InfraSource {
  /** The id of the source */
  id: string;
  /** The version number the source configuration was last persisted with */
  version?: string | null;
  /** The timestamp the source configuration was last persisted at */
  updatedAt?: number | null;
  /** The origin of the source (one of 'fallback', 'internal', 'stored') */
  origin: string;
  /** The raw configuration of the source */
  configuration: InfraSourceConfiguration;
  /** The status of the source */
  status: InfraSourceStatus;
  /** A consecutive span of log entries surrounding a point in time */
  logEntriesAround: InfraLogEntryInterval;
  /** A consecutive span of log entries within an interval */
  logEntriesBetween: InfraLogEntryInterval;
  /** Sequences of log entries matching sets of highlighting queries within an interval */
  logEntryHighlights: InfraLogEntryInterval[];

  logItem: InfraLogItem;
  /** A snapshot of nodes */
  snapshot?: InfraSnapshotResponse | null;

  metrics: InfraMetricData[];
}
/** A set of configuration options for an infrastructure data source */
export interface InfraSourceConfiguration {
  /** The name of the data source */
  name: string;
  /** A description of the data source */
  description: string;
  /** The alias to read metric data from */
  metricAlias: string;
  /** The alias to read log data from */
  logAlias: string;
  /** The field mapping to use for this source */
  fields: InfraSourceFields;
  /** The columns to use for log display */
  logColumns: InfraSourceLogColumn[];
}
/** A mapping of semantic fields to their document counterparts */
export interface InfraSourceFields {
  /** The field to identify a container by */
  container: string;
  /** The fields to identify a host by */
  host: string;
  /** The fields to use as the log message */
  message: string[];
  /** The field to identify a pod by */
  pod: string;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker: string;
  /** The field to use as a timestamp for metrics and logs */
  timestamp: string;
}
/** The built-in timestamp log column */
export interface InfraSourceTimestampLogColumn {
  timestampColumn: InfraSourceTimestampLogColumnAttributes;
}

export interface InfraSourceTimestampLogColumnAttributes {
  /** A unique id for the column */
  id: string;
}
/** The built-in message log column */
export interface InfraSourceMessageLogColumn {
  messageColumn: InfraSourceMessageLogColumnAttributes;
}

export interface InfraSourceMessageLogColumnAttributes {
  /** A unique id for the column */
  id: string;
}
/** A log column containing a field value */
export interface InfraSourceFieldLogColumn {
  fieldColumn: InfraSourceFieldLogColumnAttributes;
}

export interface InfraSourceFieldLogColumnAttributes {
  /** A unique id for the column */
  id: string;
  /** The field name this column refers to */
  field: string;
}
/** The status of an infrastructure data source */
export interface InfraSourceStatus {
  /** Whether the configured metric alias exists */
  metricAliasExists: boolean;
  /** Whether the configured log alias exists */
  logAliasExists: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any metric indices */
  metricIndicesExist: boolean;
  /** Whether the configured alias or wildcard pattern resolve to any log indices */
  logIndicesExist: boolean;
  /** The list of indices in the metric alias */
  metricIndices: string[];
  /** The list of indices in the log alias */
  logIndices: string[];
  /** The list of fields defined in the index mappings */
  indexFields: InfraIndexField[];
}
/** A descriptor of a field in an index */
export interface InfraIndexField {
  /** The name of the field */
  name: string;
  /** The type of the field's values as recognized by Kibana */
  type: string;
  /** Whether the field's values can be efficiently searched for */
  searchable: boolean;
  /** Whether the field's values can be aggregated */
  aggregatable: boolean;
  /** Whether the field should be displayed based on event.module and a ECS allowed list */
  displayable: boolean;
}
/** A consecutive sequence of log entries */
export interface InfraLogEntryInterval {
  /** The key corresponding to the start of the interval covered by the entries */
  start?: InfraTimeKey | null;
  /** The key corresponding to the end of the interval covered by the entries */
  end?: InfraTimeKey | null;
  /** Whether there are more log entries available before the start */
  hasMoreBefore: boolean;
  /** Whether there are more log entries available after the end */
  hasMoreAfter: boolean;
  /** The query the log entries were filtered by */
  filterQuery?: string | null;
  /** The query the log entries were highlighted with */
  highlightQuery?: string | null;
  /** A list of the log entries */
  entries: InfraLogEntry[];
}
/** A representation of the log entry's position in the event stream */
export interface InfraTimeKey {
  /** The timestamp of the event that the log entry corresponds to */
  time: number;
  /** The tiebreaker that disambiguates events with the same timestamp */
  tiebreaker: number;
}
/** A log entry */
export interface InfraLogEntry {
  /** A unique representation of the log entry's position in the event stream */
  key: InfraTimeKey;
  /** The log entry's id */
  gid: string;
  /** The source id */
  source: string;
  /** The columns used for rendering the log entry */
  columns: InfraLogEntryColumn[];
}
/** A special built-in column that contains the log entry's timestamp */
export interface InfraLogEntryTimestampColumn {
  /** The id of the corresponding column configuration */
  columnId: string;
  /** The timestamp */
  timestamp: number;
}
/** A special built-in column that contains the log entry's constructed message */
export interface InfraLogEntryMessageColumn {
  /** The id of the corresponding column configuration */
  columnId: string;
  /** A list of the formatted log entry segments */
  message: InfraLogMessageSegment[];
}
/** A segment of the log entry message that was derived from a field */
export interface InfraLogMessageFieldSegment {
  /** The field the segment was derived from */
  field: string;
  /** The segment's message */
  value: string;
  /** A list of highlighted substrings of the value */
  highlights: string[];
}
/** A segment of the log entry message that was derived from a string literal */
export interface InfraLogMessageConstantSegment {
  /** The segment's message */
  constant: string;
}
/** A column that contains the value of a field of the log entry */
export interface InfraLogEntryFieldColumn {
  /** The id of the corresponding column configuration */
  columnId: string;
  /** The field name of the column */
  field: string;
  /** The value of the field in the log entry */
  value: string;
  /** A list of highlighted substrings of the value */
  highlights: string[];
}

export interface InfraLogItem {
  /** The ID of the document */
  id: string;
  /** The index where the document was found */
  index: string;
  /** Time key for the document - derived from the source configuration timestamp and tiebreaker settings */
  key: InfraTimeKey;
  /** An array of flattened fields and values */
  fields: InfraLogItemField[];
}

export interface InfraLogItemField {
  /** The flattened field name */
  field: string;
  /** The value for the Field as a string */
  value: string;
}

export interface InfraSnapshotResponse {
  /** Nodes of type host, container or pod grouped by 0, 1 or 2 terms */
  nodes: InfraSnapshotNode[];
}

export interface InfraSnapshotNode {
  path: InfraSnapshotNodePath[];

  metric: InfraSnapshotNodeMetric;
}

export interface InfraSnapshotNodePath {
  value: string;

  label: string;

  ip?: string | null;
}

export interface InfraSnapshotNodeMetric {
  name: InfraSnapshotMetricType;

  value?: number | null;

  avg?: number | null;

  max?: number | null;
}

export interface InfraMetricData {
  id?: InfraMetric | null;

  series: InfraDataSeries[];
}

export interface InfraDataSeries {
  id: string;

  label: string;

  data: InfraDataPoint[];
}

export interface InfraDataPoint {
  timestamp: number;

  value?: number | null;
}

export interface Mutation {
  /** Create a new source of infrastructure data */
  createSource: UpdateSourceResult;
  /** Modify an existing source */
  updateSource: UpdateSourceResult;
  /** Delete a source of infrastructure data */
  deleteSource: DeleteSourceResult;
}
/** The result of a successful source update */
export interface UpdateSourceResult {
  /** The source that was updated */
  source: InfraSource;
}
/** The result of a source deletion operations */
export interface DeleteSourceResult {
  /** The id of the source that was deleted */
  id: string;
}

// ====================================================
// InputTypes
// ====================================================

export interface InfraTimeKeyInput {
  time: number;

  tiebreaker: number;
}
/** A highlighting definition */
export interface InfraLogEntryHighlightInput {
  /** The query to highlight by */
  query: string;
  /** The number of highlighted documents to include beyond the beginning of the interval */
  countBefore: number;
  /** The number of highlighted documents to include beyond the end of the interval */
  countAfter: number;
}

export interface InfraTimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: number;
  /** The beginning of the timerange */
  from: number;
}

export interface InfraSnapshotGroupbyInput {
  /** The label to use in the results for the group by for the terms group by */
  label?: string | null;
  /** The field to group by from a terms aggregation, this is ignored by the filter type */
  field?: string | null;
}

export interface InfraSnapshotMetricInput {
  /** The type of metric */
  type: InfraSnapshotMetricType;
}

export interface InfraNodeIdsInput {
  nodeId: string;

  cloudId?: string | null;
}
/** The properties to update the source with */
export interface UpdateSourceInput {
  /** The name of the data source */
  name?: string | null;
  /** A description of the data source */
  description?: string | null;
  /** The alias to read metric data from */
  metricAlias?: string | null;
  /** The alias to read log data from */
  logAlias?: string | null;
  /** The field mapping to use for this source */
  fields?: UpdateSourceFieldsInput | null;
  /** The log columns to display for this source */
  logColumns?: UpdateSourceLogColumnInput[] | null;
}
/** The mapping of semantic fields of the source to be created */
export interface UpdateSourceFieldsInput {
  /** The field to identify a container by */
  container?: string | null;
  /** The fields to identify a host by */
  host?: string | null;
  /** The field to identify a pod by */
  pod?: string | null;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker?: string | null;
  /** The field to use as a timestamp for metrics and logs */
  timestamp?: string | null;
}
/** One of the log column types to display for this source */
export interface UpdateSourceLogColumnInput {
  /** A custom field log column */
  fieldColumn?: UpdateSourceFieldLogColumnInput | null;
  /** A built-in message log column */
  messageColumn?: UpdateSourceMessageLogColumnInput | null;
  /** A built-in timestamp log column */
  timestampColumn?: UpdateSourceTimestampLogColumnInput | null;
}

export interface UpdateSourceFieldLogColumnInput {
  id: string;

  field: string;
}

export interface UpdateSourceMessageLogColumnInput {
  id: string;
}

export interface UpdateSourceTimestampLogColumnInput {
  id: string;
}

// ====================================================
// Arguments
// ====================================================

export interface SourceQueryArgs {
  /** The id of the source */
  id: string;
}
export interface LogEntriesAroundInfraSourceArgs {
  /** The sort key that corresponds to the point in time */
  key: InfraTimeKeyInput;
  /** The maximum number of preceding to return */
  countBefore?: number | null;
  /** The maximum number of following to return */
  countAfter?: number | null;
  /** The query to filter the log entries by */
  filterQuery?: string | null;
}
export interface LogEntriesBetweenInfraSourceArgs {
  /** The sort key that corresponds to the start of the interval */
  startKey: InfraTimeKeyInput;
  /** The sort key that corresponds to the end of the interval */
  endKey: InfraTimeKeyInput;
  /** The query to filter the log entries by */
  filterQuery?: string | null;
}
export interface LogEntryHighlightsInfraSourceArgs {
  /** The sort key that corresponds to the start of the interval */
  startKey: InfraTimeKeyInput;
  /** The sort key that corresponds to the end of the interval */
  endKey: InfraTimeKeyInput;
  /** The query to filter the log entries by */
  filterQuery?: string | null;
  /** The highlighting to apply to the log entries */
  highlights: InfraLogEntryHighlightInput[];
}
export interface LogItemInfraSourceArgs {
  id: string;
}
export interface SnapshotInfraSourceArgs {
  timerange: InfraTimerangeInput;

  filterQuery?: string | null;
}
export interface MetricsInfraSourceArgs {
  nodeIds: InfraNodeIdsInput;

  nodeType: InfraNodeType;

  timerange: InfraTimerangeInput;

  metrics: InfraMetric[];
}
export interface IndexFieldsInfraSourceStatusArgs {
  indexType?: InfraIndexType | null;
}
export interface NodesInfraSnapshotResponseArgs {
  type: InfraNodeType;

  groupBy: InfraSnapshotGroupbyInput[];

  metric: InfraSnapshotMetricInput;
}
export interface CreateSourceMutationArgs {
  /** The id of the source */
  id: string;

  sourceProperties: UpdateSourceInput;
}
export interface UpdateSourceMutationArgs {
  /** The id of the source */
  id: string;
  /** The properties to update the source with */
  sourceProperties: UpdateSourceInput;
}
export interface DeleteSourceMutationArgs {
  /** The id of the source */
  id: string;
}

// ====================================================
// Enums
// ====================================================

export enum InfraIndexType {
  ANY = 'ANY',
  LOGS = 'LOGS',
  METRICS = 'METRICS',
}

export enum InfraNodeType {
  pod = 'pod',
  container = 'container',
  host = 'host',
  awsEC2 = 'awsEC2',
  awsS3 = 'awsS3',
  awsRDS = 'awsRDS',
  awsSQS = 'awsSQS'
}

export enum InfraSnapshotMetricType {
  count = 'count',
  cpu = 'cpu',
  load = 'load',
  memory = 'memory',
  tx = 'tx',
  rx = 'rx',
  logRate = 'logRate',
  diskIOReadBytes = 'diskIOReadBytes',
  diskIOWriteBytes = 'diskIOWriteBytes',
  s3TotalRequests = 's3TotalRequests',
  s3NumberOfObjects = 's3NumberOfObjects',
  s3BucketSize = 's3BucketSize',
  s3DownloadBytes = 's3DownloadBytes',
  s3UploadBytes = 's3UploadBytes',
  rdsConnections = 'rdsConnections',
  rdsQueriesExecuted = 'rdsQueriesExecuted',
  rdsActiveTransactions = 'rdsActiveTransactions',
  rdsLatency = 'rdsLatency',
  sqsMessagesVisible = 'sqsMessagesVisible',
  sqsMessagesDelayed = 'sqsMessagesDelayed',
  sqsMessagesSent = 'sqsMessagesSent',
  sqsMessagesEmpty = 'sqsMessagesEmpty',
  sqsOldestMessage = 'sqsOldestMessage',
}

export enum InfraMetric {
  hostSystemOverview = 'hostSystemOverview',
  hostCpuUsage = 'hostCpuUsage',
  hostFilesystem = 'hostFilesystem',
  hostK8sOverview = 'hostK8sOverview',
  hostK8sCpuCap = 'hostK8sCpuCap',
  hostK8sDiskCap = 'hostK8sDiskCap',
  hostK8sMemoryCap = 'hostK8sMemoryCap',
  hostK8sPodCap = 'hostK8sPodCap',
  hostLoad = 'hostLoad',
  hostMemoryUsage = 'hostMemoryUsage',
  hostNetworkTraffic = 'hostNetworkTraffic',
  hostDockerOverview = 'hostDockerOverview',
  hostDockerInfo = 'hostDockerInfo',
  hostDockerTop5ByCpu = 'hostDockerTop5ByCpu',
  hostDockerTop5ByMemory = 'hostDockerTop5ByMemory',
  podOverview = 'podOverview',
  podCpuUsage = 'podCpuUsage',
  podMemoryUsage = 'podMemoryUsage',
  podLogUsage = 'podLogUsage',
  podNetworkTraffic = 'podNetworkTraffic',
  containerOverview = 'containerOverview',
  containerCpuKernel = 'containerCpuKernel',
  containerCpuUsage = 'containerCpuUsage',
  containerDiskIOOps = 'containerDiskIOOps',
  containerDiskIOBytes = 'containerDiskIOBytes',
  containerMemory = 'containerMemory',
  containerNetworkTraffic = 'containerNetworkTraffic',
  nginxHits = 'nginxHits',
  nginxRequestRate = 'nginxRequestRate',
  nginxActiveConnections = 'nginxActiveConnections',
  nginxRequestsPerConnection = 'nginxRequestsPerConnection',
  awsOverview = 'awsOverview',
  awsCpuUtilization = 'awsCpuUtilization',
  awsNetworkBytes = 'awsNetworkBytes',
  awsNetworkPackets = 'awsNetworkPackets',
  awsDiskioBytes = 'awsDiskioBytes',
  awsDiskioOps = 'awsDiskioOps',
  awsEC2CpuUtilization = 'awsEC2CpuUtilization',
  awsEC2DiskIOBytes = 'awsEC2DiskIOBytes',
  awsEC2NetworkTraffic = 'awsEC2NetworkTraffic',
  awsS3TotalRequests = 'awsS3TotalRequests',
  awsS3NumberOfObjects = 'awsS3NumberOfObjects',
  awsS3BucketSize = 'awsS3BucketSize',
  awsS3DownloadBytes = 'awsS3DownloadBytes',
  awsS3UploadBytes = 'awsS3UploadBytes',
  awsRDSCpuTotal = 'awsRDSCpuTotal',
  awsRDSConnections = 'awsRDSConnections',
  awsRDSQueriesExecuted = 'awsRDSQueriesExecuted',
  awsRDSActiveTransactions = 'awsRDSActiveTransactions',
  awsRDSLatency = 'awsRDSLatency',
  awsSQSMessagesVisible = 'awsSQSMessagesVisible',
  awsSQSMessagesDelayed = 'awsSQSMessagesDelayed',
  awsSQSMessagesSent = 'awsSQSMessagesSent',
  awsSQSMessagesEmpty = 'awsSQSMessagesEmpty',
  awsSQSOldestMessage = 'awsSQSOldestMessage',
  custom = 'custom',
}

// ====================================================
// Unions
// ====================================================

/** All known log column types */
export type InfraSourceLogColumn =
  | InfraSourceTimestampLogColumn
  | InfraSourceMessageLogColumn
  | InfraSourceFieldLogColumn;

/** A column of a log entry */
export type InfraLogEntryColumn =
  | InfraLogEntryTimestampColumn
  | InfraLogEntryMessageColumn
  | InfraLogEntryFieldColumn;

/** A segment of the log entry message */
export type InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment;

// ====================================================
// END: Typescript template
// ====================================================

// ====================================================
// Resolvers
// ====================================================

export namespace QueryResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = never> {
    /** Get an infrastructure data source by id.The resolution order for the source configuration attributes is as followswith the first defined value winning:1. The attributes of the saved object with the given 'id'.2. The attributes defined in the static Kibana configuration key'xpack.infra.sources.default'.3. The hard-coded default values.As a consequence, querying a source that doesn't exist doesn't error out,but returns the configured or hardcoded defaults. */
    source?: SourceResolver<InfraSource, TypeParent, Context>;
    /** Get a list of all infrastructure data sources */
    allSources?: AllSourcesResolver<InfraSource[], TypeParent, Context>;
  }

  export type SourceResolver<R = InfraSource, Parent = never, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context,
    SourceArgs
  >;
  export interface SourceArgs {
    /** The id of the source */
    id: string;
  }

  export type AllSourcesResolver<
    R = InfraSource[],
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A source of infrastructure data */
export namespace InfraSourceResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSource> {
    /** The id of the source */
    id?: IdResolver<string, TypeParent, Context>;
    /** The version number the source configuration was last persisted with */
    version?: VersionResolver<string | null, TypeParent, Context>;
    /** The timestamp the source configuration was last persisted at */
    updatedAt?: UpdatedAtResolver<number | null, TypeParent, Context>;
    /** The origin of the source (one of 'fallback', 'internal', 'stored') */
    origin?: OriginResolver<string, TypeParent, Context>;
    /** The raw configuration of the source */
    configuration?: ConfigurationResolver<InfraSourceConfiguration, TypeParent, Context>;
    /** The status of the source */
    status?: StatusResolver<InfraSourceStatus, TypeParent, Context>;
    /** A consecutive span of log entries surrounding a point in time */
    logEntriesAround?: LogEntriesAroundResolver<InfraLogEntryInterval, TypeParent, Context>;
    /** A consecutive span of log entries within an interval */
    logEntriesBetween?: LogEntriesBetweenResolver<InfraLogEntryInterval, TypeParent, Context>;
    /** Sequences of log entries matching sets of highlighting queries within an interval */
    logEntryHighlights?: LogEntryHighlightsResolver<InfraLogEntryInterval[], TypeParent, Context>;

    logItem?: LogItemResolver<InfraLogItem, TypeParent, Context>;
    /** A snapshot of nodes */
    snapshot?: SnapshotResolver<InfraSnapshotResponse | null, TypeParent, Context>;

    metrics?: MetricsResolver<InfraMetricData[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraSource, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type VersionResolver<
    R = string | null,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type UpdatedAtResolver<
    R = number | null,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type OriginResolver<R = string, Parent = InfraSource, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ConfigurationResolver<
    R = InfraSourceConfiguration,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type StatusResolver<
    R = InfraSourceStatus,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogEntriesAroundResolver<
    R = InfraLogEntryInterval,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogEntriesAroundArgs>;
  export interface LogEntriesAroundArgs {
    /** The sort key that corresponds to the point in time */
    key: InfraTimeKeyInput;
    /** The maximum number of preceding to return */
    countBefore?: number | null;
    /** The maximum number of following to return */
    countAfter?: number | null;
    /** The query to filter the log entries by */
    filterQuery?: string | null;
  }

  export type LogEntriesBetweenResolver<
    R = InfraLogEntryInterval,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogEntriesBetweenArgs>;
  export interface LogEntriesBetweenArgs {
    /** The sort key that corresponds to the start of the interval */
    startKey: InfraTimeKeyInput;
    /** The sort key that corresponds to the end of the interval */
    endKey: InfraTimeKeyInput;
    /** The query to filter the log entries by */
    filterQuery?: string | null;
  }

  export type LogEntryHighlightsResolver<
    R = InfraLogEntryInterval[],
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogEntryHighlightsArgs>;
  export interface LogEntryHighlightsArgs {
    /** The sort key that corresponds to the start of the interval */
    startKey: InfraTimeKeyInput;
    /** The sort key that corresponds to the end of the interval */
    endKey: InfraTimeKeyInput;
    /** The query to filter the log entries by */
    filterQuery?: string | null;
    /** The highlighting to apply to the log entries */
    highlights: InfraLogEntryHighlightInput[];
  }

  export type LogItemResolver<
    R = InfraLogItem,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, LogItemArgs>;
  export interface LogItemArgs {
    id: string;
  }

  export type SnapshotResolver<
    R = InfraSnapshotResponse | null,
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, SnapshotArgs>;
  export interface SnapshotArgs {
    timerange: InfraTimerangeInput;

    filterQuery?: string | null;
  }

  export type MetricsResolver<
    R = InfraMetricData[],
    Parent = InfraSource,
    Context = InfraContext
  > = Resolver<R, Parent, Context, MetricsArgs>;
  export interface MetricsArgs {
    nodeIds: InfraNodeIdsInput;

    nodeType: InfraNodeType;

    timerange: InfraTimerangeInput;

    metrics: InfraMetric[];
  }
}
/** A set of configuration options for an infrastructure data source */
export namespace InfraSourceConfigurationResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceConfiguration> {
    /** The name of the data source */
    name?: NameResolver<string, TypeParent, Context>;
    /** A description of the data source */
    description?: DescriptionResolver<string, TypeParent, Context>;
    /** The alias to read metric data from */
    metricAlias?: MetricAliasResolver<string, TypeParent, Context>;
    /** The alias to read log data from */
    logAlias?: LogAliasResolver<string, TypeParent, Context>;
    /** The field mapping to use for this source */
    fields?: FieldsResolver<InfraSourceFields, TypeParent, Context>;
    /** The columns to use for log display */
    logColumns?: LogColumnsResolver<InfraSourceLogColumn[], TypeParent, Context>;
  }

  export type NameResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type DescriptionResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricAliasResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogAliasResolver<
    R = string,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FieldsResolver<
    R = InfraSourceFields,
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogColumnsResolver<
    R = InfraSourceLogColumn[],
    Parent = InfraSourceConfiguration,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A mapping of semantic fields to their document counterparts */
export namespace InfraSourceFieldsResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceFields> {
    /** The field to identify a container by */
    container?: ContainerResolver<string, TypeParent, Context>;
    /** The fields to identify a host by */
    host?: HostResolver<string, TypeParent, Context>;
    /** The fields to use as the log message */
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
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HostResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MessageResolver<
    R = string[],
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type PodResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type TiebreakerResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = string,
    Parent = InfraSourceFields,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The built-in timestamp log column */
export namespace InfraSourceTimestampLogColumnResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceTimestampLogColumn> {
    timestampColumn?: TimestampColumnResolver<
      InfraSourceTimestampLogColumnAttributes,
      TypeParent,
      Context
    >;
  }

  export type TimestampColumnResolver<
    R = InfraSourceTimestampLogColumnAttributes,
    Parent = InfraSourceTimestampLogColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraSourceTimestampLogColumnAttributesResolvers {
  export interface Resolvers<
    Context = InfraContext,
    TypeParent = InfraSourceTimestampLogColumnAttributes
  > {
    /** A unique id for the column */
    id?: IdResolver<string, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = InfraSourceTimestampLogColumnAttributes,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The built-in message log column */
export namespace InfraSourceMessageLogColumnResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceMessageLogColumn> {
    messageColumn?: MessageColumnResolver<
      InfraSourceMessageLogColumnAttributes,
      TypeParent,
      Context
    >;
  }

  export type MessageColumnResolver<
    R = InfraSourceMessageLogColumnAttributes,
    Parent = InfraSourceMessageLogColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraSourceMessageLogColumnAttributesResolvers {
  export interface Resolvers<
    Context = InfraContext,
    TypeParent = InfraSourceMessageLogColumnAttributes
  > {
    /** A unique id for the column */
    id?: IdResolver<string, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = InfraSourceMessageLogColumnAttributes,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A log column containing a field value */
export namespace InfraSourceFieldLogColumnResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceFieldLogColumn> {
    fieldColumn?: FieldColumnResolver<InfraSourceFieldLogColumnAttributes, TypeParent, Context>;
  }

  export type FieldColumnResolver<
    R = InfraSourceFieldLogColumnAttributes,
    Parent = InfraSourceFieldLogColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraSourceFieldLogColumnAttributesResolvers {
  export interface Resolvers<
    Context = InfraContext,
    TypeParent = InfraSourceFieldLogColumnAttributes
  > {
    /** A unique id for the column */
    id?: IdResolver<string, TypeParent, Context>;
    /** The field name this column refers to */
    field?: FieldResolver<string, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = InfraSourceFieldLogColumnAttributes,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FieldResolver<
    R = string,
    Parent = InfraSourceFieldLogColumnAttributes,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The status of an infrastructure data source */
export namespace InfraSourceStatusResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSourceStatus> {
    /** Whether the configured metric alias exists */
    metricAliasExists?: MetricAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured log alias exists */
    logAliasExists?: LogAliasExistsResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any metric indices */
    metricIndicesExist?: MetricIndicesExistResolver<boolean, TypeParent, Context>;
    /** Whether the configured alias or wildcard pattern resolve to any log indices */
    logIndicesExist?: LogIndicesExistResolver<boolean, TypeParent, Context>;
    /** The list of indices in the metric alias */
    metricIndices?: MetricIndicesResolver<string[], TypeParent, Context>;
    /** The list of indices in the log alias */
    logIndices?: LogIndicesResolver<string[], TypeParent, Context>;
    /** The list of fields defined in the index mappings */
    indexFields?: IndexFieldsResolver<InfraIndexField[], TypeParent, Context>;
  }

  export type MetricAliasExistsResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogAliasExistsResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricIndicesExistResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogIndicesExistResolver<
    R = boolean,
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricIndicesResolver<
    R = string[],
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LogIndicesResolver<
    R = string[],
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type IndexFieldsResolver<
    R = InfraIndexField[],
    Parent = InfraSourceStatus,
    Context = InfraContext
  > = Resolver<R, Parent, Context, IndexFieldsArgs>;
  export interface IndexFieldsArgs {
    indexType?: InfraIndexType | null;
  }
}
/** A descriptor of a field in an index */
export namespace InfraIndexFieldResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraIndexField> {
    /** The name of the field */
    name?: NameResolver<string, TypeParent, Context>;
    /** The type of the field's values as recognized by Kibana */
    type?: TypeResolver<string, TypeParent, Context>;
    /** Whether the field's values can be efficiently searched for */
    searchable?: SearchableResolver<boolean, TypeParent, Context>;
    /** Whether the field's values can be aggregated */
    aggregatable?: AggregatableResolver<boolean, TypeParent, Context>;
    /** Whether the field should be displayed based on event.module and a ECS allowed list */
    displayable?: DisplayableResolver<boolean, TypeParent, Context>;
  }

  export type NameResolver<R = string, Parent = InfraIndexField, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TypeResolver<R = string, Parent = InfraIndexField, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SearchableResolver<
    R = boolean,
    Parent = InfraIndexField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type AggregatableResolver<
    R = boolean,
    Parent = InfraIndexField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type DisplayableResolver<
    R = boolean,
    Parent = InfraIndexField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A consecutive sequence of log entries */
export namespace InfraLogEntryIntervalResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntryInterval> {
    /** The key corresponding to the start of the interval covered by the entries */
    start?: StartResolver<InfraTimeKey | null, TypeParent, Context>;
    /** The key corresponding to the end of the interval covered by the entries */
    end?: EndResolver<InfraTimeKey | null, TypeParent, Context>;
    /** Whether there are more log entries available before the start */
    hasMoreBefore?: HasMoreBeforeResolver<boolean, TypeParent, Context>;
    /** Whether there are more log entries available after the end */
    hasMoreAfter?: HasMoreAfterResolver<boolean, TypeParent, Context>;
    /** The query the log entries were filtered by */
    filterQuery?: FilterQueryResolver<string | null, TypeParent, Context>;
    /** The query the log entries were highlighted with */
    highlightQuery?: HighlightQueryResolver<string | null, TypeParent, Context>;
    /** A list of the log entries */
    entries?: EntriesResolver<InfraLogEntry[], TypeParent, Context>;
  }

  export type StartResolver<
    R = InfraTimeKey | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EndResolver<
    R = InfraTimeKey | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HasMoreBeforeResolver<
    R = boolean,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HasMoreAfterResolver<
    R = boolean,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FilterQueryResolver<
    R = string | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HighlightQueryResolver<
    R = string | null,
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type EntriesResolver<
    R = InfraLogEntry[],
    Parent = InfraLogEntryInterval,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A representation of the log entry's position in the event stream */
export namespace InfraTimeKeyResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraTimeKey> {
    /** The timestamp of the event that the log entry corresponds to */
    time?: TimeResolver<number, TypeParent, Context>;
    /** The tiebreaker that disambiguates events with the same timestamp */
    tiebreaker?: TiebreakerResolver<number, TypeParent, Context>;
  }

  export type TimeResolver<R = number, Parent = InfraTimeKey, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type TiebreakerResolver<
    R = number,
    Parent = InfraTimeKey,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A log entry */
export namespace InfraLogEntryResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntry> {
    /** A unique representation of the log entry's position in the event stream */
    key?: KeyResolver<InfraTimeKey, TypeParent, Context>;
    /** The log entry's id */
    gid?: GidResolver<string, TypeParent, Context>;
    /** The source id */
    source?: SourceResolver<string, TypeParent, Context>;
    /** The columns used for rendering the log entry */
    columns?: ColumnsResolver<InfraLogEntryColumn[], TypeParent, Context>;
  }

  export type KeyResolver<
    R = InfraTimeKey,
    Parent = InfraLogEntry,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type GidResolver<R = string, Parent = InfraLogEntry, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type SourceResolver<R = string, Parent = InfraLogEntry, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type ColumnsResolver<
    R = InfraLogEntryColumn[],
    Parent = InfraLogEntry,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A special built-in column that contains the log entry's timestamp */
export namespace InfraLogEntryTimestampColumnResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntryTimestampColumn> {
    /** The id of the corresponding column configuration */
    columnId?: ColumnIdResolver<string, TypeParent, Context>;
    /** The timestamp */
    timestamp?: TimestampResolver<number, TypeParent, Context>;
  }

  export type ColumnIdResolver<
    R = string,
    Parent = InfraLogEntryTimestampColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type TimestampResolver<
    R = number,
    Parent = InfraLogEntryTimestampColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A special built-in column that contains the log entry's constructed message */
export namespace InfraLogEntryMessageColumnResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntryMessageColumn> {
    /** The id of the corresponding column configuration */
    columnId?: ColumnIdResolver<string, TypeParent, Context>;
    /** A list of the formatted log entry segments */
    message?: MessageResolver<InfraLogMessageSegment[], TypeParent, Context>;
  }

  export type ColumnIdResolver<
    R = string,
    Parent = InfraLogEntryMessageColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MessageResolver<
    R = InfraLogMessageSegment[],
    Parent = InfraLogEntryMessageColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A segment of the log entry message that was derived from a field */
export namespace InfraLogMessageFieldSegmentResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogMessageFieldSegment> {
    /** The field the segment was derived from */
    field?: FieldResolver<string, TypeParent, Context>;
    /** The segment's message */
    value?: ValueResolver<string, TypeParent, Context>;
    /** A list of highlighted substrings of the value */
    highlights?: HighlightsResolver<string[], TypeParent, Context>;
  }

  export type FieldResolver<
    R = string,
    Parent = InfraLogMessageFieldSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = string,
    Parent = InfraLogMessageFieldSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HighlightsResolver<
    R = string[],
    Parent = InfraLogMessageFieldSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A segment of the log entry message that was derived from a string literal */
export namespace InfraLogMessageConstantSegmentResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogMessageConstantSegment> {
    /** The segment's message */
    constant?: ConstantResolver<string, TypeParent, Context>;
  }

  export type ConstantResolver<
    R = string,
    Parent = InfraLogMessageConstantSegment,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** A column that contains the value of a field of the log entry */
export namespace InfraLogEntryFieldColumnResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogEntryFieldColumn> {
    /** The id of the corresponding column configuration */
    columnId?: ColumnIdResolver<string, TypeParent, Context>;
    /** The field name of the column */
    field?: FieldResolver<string, TypeParent, Context>;
    /** The value of the field in the log entry */
    value?: ValueResolver<string, TypeParent, Context>;
    /** A list of highlighted substrings of the value */
    highlights?: HighlightsResolver<string[], TypeParent, Context>;
  }

  export type ColumnIdResolver<
    R = string,
    Parent = InfraLogEntryFieldColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FieldResolver<
    R = string,
    Parent = InfraLogEntryFieldColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = string,
    Parent = InfraLogEntryFieldColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type HighlightsResolver<
    R = string[],
    Parent = InfraLogEntryFieldColumn,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraLogItemResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogItem> {
    /** The ID of the document */
    id?: IdResolver<string, TypeParent, Context>;
    /** The index where the document was found */
    index?: IndexResolver<string, TypeParent, Context>;
    /** Time key for the document - derived from the source configuration timestamp and tiebreaker settings */
    key?: KeyResolver<InfraTimeKey, TypeParent, Context>;
    /** An array of flattened fields and values */
    fields?: FieldsResolver<InfraLogItemField[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraLogItem, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type IndexResolver<R = string, Parent = InfraLogItem, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type KeyResolver<
    R = InfraTimeKey,
    Parent = InfraLogItem,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type FieldsResolver<
    R = InfraLogItemField[],
    Parent = InfraLogItem,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraLogItemFieldResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraLogItemField> {
    /** The flattened field name */
    field?: FieldResolver<string, TypeParent, Context>;
    /** The value for the Field as a string */
    value?: ValueResolver<string, TypeParent, Context>;
  }

  export type FieldResolver<
    R = string,
    Parent = InfraLogItemField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = string,
    Parent = InfraLogItemField,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraSnapshotResponseResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSnapshotResponse> {
    /** Nodes of type host, container or pod grouped by 0, 1 or 2 terms */
    nodes?: NodesResolver<InfraSnapshotNode[], TypeParent, Context>;
  }

  export type NodesResolver<
    R = InfraSnapshotNode[],
    Parent = InfraSnapshotResponse,
    Context = InfraContext
  > = Resolver<R, Parent, Context, NodesArgs>;
  export interface NodesArgs {
    type: InfraNodeType;

    groupBy: InfraSnapshotGroupbyInput[];

    metric: InfraSnapshotMetricInput;
  }
}

export namespace InfraSnapshotNodeResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSnapshotNode> {
    path?: PathResolver<InfraSnapshotNodePath[], TypeParent, Context>;

    metric?: MetricResolver<InfraSnapshotNodeMetric, TypeParent, Context>;
  }

  export type PathResolver<
    R = InfraSnapshotNodePath[],
    Parent = InfraSnapshotNode,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MetricResolver<
    R = InfraSnapshotNodeMetric,
    Parent = InfraSnapshotNode,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraSnapshotNodePathResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSnapshotNodePath> {
    value?: ValueResolver<string, TypeParent, Context>;

    label?: LabelResolver<string, TypeParent, Context>;

    ip?: IpResolver<string | null, TypeParent, Context>;
  }

  export type ValueResolver<
    R = string,
    Parent = InfraSnapshotNodePath,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type LabelResolver<
    R = string,
    Parent = InfraSnapshotNodePath,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type IpResolver<
    R = string | null,
    Parent = InfraSnapshotNodePath,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraSnapshotNodeMetricResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraSnapshotNodeMetric> {
    name?: NameResolver<InfraSnapshotMetricType, TypeParent, Context>;

    value?: ValueResolver<number | null, TypeParent, Context>;

    avg?: AvgResolver<number | null, TypeParent, Context>;

    max?: MaxResolver<number | null, TypeParent, Context>;
  }

  export type NameResolver<
    R = InfraSnapshotMetricType,
    Parent = InfraSnapshotNodeMetric,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = number | null,
    Parent = InfraSnapshotNodeMetric,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type AvgResolver<
    R = number | null,
    Parent = InfraSnapshotNodeMetric,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type MaxResolver<
    R = number | null,
    Parent = InfraSnapshotNodeMetric,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraMetricDataResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraMetricData> {
    id?: IdResolver<InfraMetric | null, TypeParent, Context>;

    series?: SeriesResolver<InfraDataSeries[], TypeParent, Context>;
  }

  export type IdResolver<
    R = InfraMetric | null,
    Parent = InfraMetricData,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type SeriesResolver<
    R = InfraDataSeries[],
    Parent = InfraMetricData,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraDataSeriesResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraDataSeries> {
    id?: IdResolver<string, TypeParent, Context>;

    label?: LabelResolver<string, TypeParent, Context>;

    data?: DataResolver<InfraDataPoint[], TypeParent, Context>;
  }

  export type IdResolver<R = string, Parent = InfraDataSeries, Context = InfraContext> = Resolver<
    R,
    Parent,
    Context
  >;
  export type LabelResolver<
    R = string,
    Parent = InfraDataSeries,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type DataResolver<
    R = InfraDataPoint[],
    Parent = InfraDataSeries,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace InfraDataPointResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = InfraDataPoint> {
    timestamp?: TimestampResolver<number, TypeParent, Context>;

    value?: ValueResolver<number | null, TypeParent, Context>;
  }

  export type TimestampResolver<
    R = number,
    Parent = InfraDataPoint,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
  export type ValueResolver<
    R = number | null,
    Parent = InfraDataPoint,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}

export namespace MutationResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = never> {
    /** Create a new source of infrastructure data */
    createSource?: CreateSourceResolver<UpdateSourceResult, TypeParent, Context>;
    /** Modify an existing source */
    updateSource?: UpdateSourceResolver<UpdateSourceResult, TypeParent, Context>;
    /** Delete a source of infrastructure data */
    deleteSource?: DeleteSourceResolver<DeleteSourceResult, TypeParent, Context>;
  }

  export type CreateSourceResolver<
    R = UpdateSourceResult,
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context, CreateSourceArgs>;
  export interface CreateSourceArgs {
    /** The id of the source */
    id: string;

    sourceProperties: UpdateSourceInput;
  }

  export type UpdateSourceResolver<
    R = UpdateSourceResult,
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context, UpdateSourceArgs>;
  export interface UpdateSourceArgs {
    /** The id of the source */
    id: string;
    /** The properties to update the source with */
    sourceProperties: UpdateSourceInput;
  }

  export type DeleteSourceResolver<
    R = DeleteSourceResult,
    Parent = never,
    Context = InfraContext
  > = Resolver<R, Parent, Context, DeleteSourceArgs>;
  export interface DeleteSourceArgs {
    /** The id of the source */
    id: string;
  }
}
/** The result of a successful source update */
export namespace UpdateSourceResultResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = UpdateSourceResult> {
    /** The source that was updated */
    source?: SourceResolver<InfraSource, TypeParent, Context>;
  }

  export type SourceResolver<
    R = InfraSource,
    Parent = UpdateSourceResult,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
/** The result of a source deletion operations */
export namespace DeleteSourceResultResolvers {
  export interface Resolvers<Context = InfraContext, TypeParent = DeleteSourceResult> {
    /** The id of the source that was deleted */
    id?: IdResolver<string, TypeParent, Context>;
  }

  export type IdResolver<
    R = string,
    Parent = DeleteSourceResult,
    Context = InfraContext
  > = Resolver<R, Parent, Context>;
}
