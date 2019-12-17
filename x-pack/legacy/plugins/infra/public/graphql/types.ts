import { SnapshotMetricType } from '../../common/inventory_models/types';

/* tslint:disable */

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
  name: SnapshotMetricType;

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
  awsSQS = 'awsSQS',
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
// Documents
// ====================================================

export namespace FlyoutItemQuery {
  export type Variables = {
    sourceId: string;
    itemId: string;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    id: string;

    logItem: LogItem;
  };

  export type LogItem = {
    __typename?: 'InfraLogItem';

    id: string;

    index: string;

    key: Key;

    fields: Fields[];
  };

  export type Key = InfraTimeKeyFields.Fragment;

  export type Fields = {
    __typename?: 'InfraLogItemField';

    field: string;

    value: string;
  };
}

export namespace LogEntryHighlightsQuery {
  export type Variables = {
    sourceId?: string | null;
    startKey: InfraTimeKeyInput;
    endKey: InfraTimeKeyInput;
    filterQuery?: string | null;
    highlights: InfraLogEntryHighlightInput[];
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    id: string;

    logEntryHighlights: LogEntryHighlights[];
  };

  export type LogEntryHighlights = {
    __typename?: 'InfraLogEntryInterval';

    start?: Start | null;

    end?: End | null;

    entries: Entries[];
  };

  export type Start = InfraTimeKeyFields.Fragment;

  export type End = InfraTimeKeyFields.Fragment;

  export type Entries = InfraLogEntryHighlightFields.Fragment;
}

export namespace MetricsQuery {
  export type Variables = {
    sourceId: string;
    timerange: InfraTimerangeInput;
    metrics: InfraMetric[];
    nodeId: string;
    cloudId?: string | null;
    nodeType: InfraNodeType;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    id: string;

    metrics: Metrics[];
  };

  export type Metrics = {
    __typename?: 'InfraMetricData';

    id?: InfraMetric | null;

    series: Series[];
  };

  export type Series = {
    __typename?: 'InfraDataSeries';

    id: string;

    label: string;

    data: Data[];
  };

  export type Data = {
    __typename?: 'InfraDataPoint';

    timestamp: number;

    value?: number | null;
  };
}

export namespace CreateSourceConfigurationMutation {
  export type Variables = {
    sourceId: string;
    sourceProperties: UpdateSourceInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    createSource: CreateSource;
  };

  export type CreateSource = {
    __typename?: 'UpdateSourceResult';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    configuration: Configuration;

    status: Status;
  } & InfraSourceFields.Fragment;

  export type Configuration = SourceConfigurationFields.Fragment;

  export type Status = SourceStatusFields.Fragment;
}

export namespace SourceQuery {
  export type Variables = {
    sourceId?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    configuration: Configuration;

    status: Status;
  } & InfraSourceFields.Fragment;

  export type Configuration = SourceConfigurationFields.Fragment;

  export type Status = SourceStatusFields.Fragment;
}

export namespace UpdateSourceMutation {
  export type Variables = {
    sourceId?: string | null;
    sourceProperties: UpdateSourceInput;
  };

  export type Mutation = {
    __typename?: 'Mutation';

    updateSource: UpdateSource;
  };

  export type UpdateSource = {
    __typename?: 'UpdateSourceResult';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    configuration: Configuration;

    status: Status;
  } & InfraSourceFields.Fragment;

  export type Configuration = SourceConfigurationFields.Fragment;

  export type Status = SourceStatusFields.Fragment;
}

export namespace WaffleNodesQuery {
  export type Variables = {
    sourceId: string;
    timerange: InfraTimerangeInput;
    filterQuery?: string | null;
    metric: InfraSnapshotMetricInput;
    groupBy: InfraSnapshotGroupbyInput[];
    type: InfraNodeType;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    id: string;

    snapshot?: Snapshot | null;
  };

  export type Snapshot = {
    __typename?: 'InfraSnapshotResponse';

    nodes: Nodes[];
  };

  export type Nodes = {
    __typename?: 'InfraSnapshotNode';

    path: Path[];

    metric: Metric;
  };

  export type Path = {
    __typename?: 'InfraSnapshotNodePath';

    value: string;

    label: string;

    ip?: string | null;
  };

  export type Metric = {
    __typename?: 'InfraSnapshotNodeMetric';

    name: InfraSnapshotMetricType;

    value?: number | null;

    avg?: number | null;

    max?: number | null;
  };
}

export namespace LogEntries {
  export type Variables = {
    sourceId?: string | null;
    timeKey: InfraTimeKeyInput;
    countBefore?: number | null;
    countAfter?: number | null;
    filterQuery?: string | null;
  };

  export type Query = {
    __typename?: 'Query';

    source: Source;
  };

  export type Source = {
    __typename?: 'InfraSource';

    id: string;

    logEntriesAround: LogEntriesAround;
  };

  export type LogEntriesAround = {
    __typename?: 'InfraLogEntryInterval';

    start?: Start | null;

    end?: End | null;

    hasMoreBefore: boolean;

    hasMoreAfter: boolean;

    entries: Entries[];
  };

  export type Start = InfraTimeKeyFields.Fragment;

  export type End = InfraTimeKeyFields.Fragment;

  export type Entries = InfraLogEntryFields.Fragment;
}

export namespace SourceConfigurationFields {
  export type Fragment = {
    __typename?: 'InfraSourceConfiguration';

    name: string;

    description: string;

    logAlias: string;

    metricAlias: string;

    fields: Fields;

    logColumns: LogColumns[];
  };

  export type Fields = {
    __typename?: 'InfraSourceFields';

    container: string;

    host: string;

    message: string[];

    pod: string;

    tiebreaker: string;

    timestamp: string;
  };

  export type LogColumns =
    | InfraSourceTimestampLogColumnInlineFragment
    | InfraSourceMessageLogColumnInlineFragment
    | InfraSourceFieldLogColumnInlineFragment;

  export type InfraSourceTimestampLogColumnInlineFragment = {
    __typename?: 'InfraSourceTimestampLogColumn';

    timestampColumn: TimestampColumn;
  };

  export type TimestampColumn = {
    __typename?: 'InfraSourceTimestampLogColumnAttributes';

    id: string;
  };

  export type InfraSourceMessageLogColumnInlineFragment = {
    __typename?: 'InfraSourceMessageLogColumn';

    messageColumn: MessageColumn;
  };

  export type MessageColumn = {
    __typename?: 'InfraSourceMessageLogColumnAttributes';

    id: string;
  };

  export type InfraSourceFieldLogColumnInlineFragment = {
    __typename?: 'InfraSourceFieldLogColumn';

    fieldColumn: FieldColumn;
  };

  export type FieldColumn = {
    __typename?: 'InfraSourceFieldLogColumnAttributes';

    id: string;

    field: string;
  };
}

export namespace SourceStatusFields {
  export type Fragment = {
    __typename?: 'InfraSourceStatus';

    indexFields: IndexFields[];

    logIndicesExist: boolean;

    metricIndicesExist: boolean;
  };

  export type IndexFields = {
    __typename?: 'InfraIndexField';

    name: string;

    type: string;

    searchable: boolean;

    aggregatable: boolean;

    displayable: boolean;
  };
}

export namespace InfraTimeKeyFields {
  export type Fragment = {
    __typename?: 'InfraTimeKey';

    time: number;

    tiebreaker: number;
  };
}

export namespace InfraSourceFields {
  export type Fragment = {
    __typename?: 'InfraSource';

    id: string;

    version?: string | null;

    updatedAt?: number | null;

    origin: string;
  };
}

export namespace InfraLogEntryFields {
  export type Fragment = {
    __typename?: 'InfraLogEntry';

    gid: string;

    key: Key;

    columns: Columns[];
  };

  export type Key = {
    __typename?: 'InfraTimeKey';

    time: number;

    tiebreaker: number;
  };

  export type Columns =
    | InfraLogEntryTimestampColumnInlineFragment
    | InfraLogEntryMessageColumnInlineFragment
    | InfraLogEntryFieldColumnInlineFragment;

  export type InfraLogEntryTimestampColumnInlineFragment = {
    __typename?: 'InfraLogEntryTimestampColumn';

    columnId: string;

    timestamp: number;
  };

  export type InfraLogEntryMessageColumnInlineFragment = {
    __typename?: 'InfraLogEntryMessageColumn';

    columnId: string;

    message: Message[];
  };

  export type Message =
    | InfraLogMessageFieldSegmentInlineFragment
    | InfraLogMessageConstantSegmentInlineFragment;

  export type InfraLogMessageFieldSegmentInlineFragment = {
    __typename?: 'InfraLogMessageFieldSegment';

    field: string;

    value: string;
  };

  export type InfraLogMessageConstantSegmentInlineFragment = {
    __typename?: 'InfraLogMessageConstantSegment';

    constant: string;
  };

  export type InfraLogEntryFieldColumnInlineFragment = {
    __typename?: 'InfraLogEntryFieldColumn';

    columnId: string;

    field: string;

    value: string;
  };
}

export namespace InfraLogEntryHighlightFields {
  export type Fragment = {
    __typename?: 'InfraLogEntry';

    gid: string;

    key: Key;

    columns: Columns[];
  };

  export type Key = {
    __typename?: 'InfraTimeKey';

    time: number;

    tiebreaker: number;
  };

  export type Columns =
    | InfraLogEntryMessageColumnInlineFragment
    | InfraLogEntryFieldColumnInlineFragment;

  export type InfraLogEntryMessageColumnInlineFragment = {
    __typename?: 'InfraLogEntryMessageColumn';

    columnId: string;

    message: Message[];
  };

  export type Message = InfraLogMessageFieldSegmentInlineFragment;

  export type InfraLogMessageFieldSegmentInlineFragment = {
    __typename?: 'InfraLogMessageFieldSegment';

    field: string;

    highlights: string[];
  };

  export type InfraLogEntryFieldColumnInlineFragment = {
    __typename?: 'InfraLogEntryFieldColumn';

    columnId: string;

    field: string;

    highlights: string[];
  };
}
