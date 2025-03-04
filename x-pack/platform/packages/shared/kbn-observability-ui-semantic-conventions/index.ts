/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';

// Stable OpenTelemetry Semantic Conventions fields
// See https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/src/stable_attributes.ts
export { ATTR_SERVICE_NAME, ATTR_URL_FULL } from '@opentelemetry/semantic-conventions';

// Incubating OpenTelemetry Semantic Conventions fields
// See https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/src/experimental_attributes.ts
export {
  ATTR_CONTAINER_NAME,
  ATTR_HOST_ID,
  ATTR_HOST_IP,
  ATTR_HOST_NAME,
  ATTR_USER_AGENT_NAME,
  ATTR_USER_AGENT_VERSION,
} from '@opentelemetry/semantic-conventions/incubating';

// ECS fields

/**
 * Custom name of the agent.
 *
 * This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-agent.html#field-agent-name
 */
export const ATTR_AGENT_NAME = EcsFlat['agent.name'].name;

/**
 * Country ISO code.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-client.html#ecs-client-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-country-iso-code
 */
export const ATTR_CLIENT_GEO_COUNTRY_ISO_CODE = EcsFlat['client.geo.country_iso_code'].name;

/**
 * Country name.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-client.html#ecs-client-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-country-name
 */
export const ATTR_CLIENT_GEO_COUNTRY_NAME = EcsFlat['client.geo.country_name'].name;

/**
 * Country ISO code.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-client.html#ecs-client-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-region-iso-code
 */
export const ATTR_CLIENT_GEO_REGION_ISO_CODE = EcsFlat['client.geo.region_iso_code'].name;

/**
 * An overarching type for the data stream.
 * Currently allowed values are "logs" and "metrics". We expect to also add "traces" and "synthetics" in the near future.
 
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-data_stream.html#field-data-stream-type
 */
export const ATTR_DATA_STREAM_TYPE = EcsFlat['data_stream.type'].name;

/**
 * Name of the dataset.
 *
 * If an event source publishes more than one type of log or events (e.g. access log, error log), the dataset is used to specify which one the event comes from.
 *
 * It’s recommended but not required to start the dataset name with the module name, followed by a dot, then the dataset name.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-dataset
 */
export const ATTR_EVENT_DATASET = EcsFlat['event.dataset'].name;

/**
 * For log events the message field contains the log message, optimized for viewing in a log viewer.
 *
 * For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event.
 *
 * If multiple messages exist, they can be combined into one message.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-base.html#field-message
 */
export const ATTR_MESSAGE = EcsFlat.message.name;

/**
 * User-defined description of a location, at the level of granularity they care about.
 *
 * Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.
 *
 * Not typically used in automated geolocation.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-observer.html#ecs-observer-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-name
 */
export const ATTR_OBSERVER_GEO_NAME = EcsFlat['observer.geo.name'].name;

/**
 * [beta] This field is beta and subject to change.
 *
 * Identifies the environment where the service is running.
 *
 * If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-environment
 */
export const ATTR_SERVICE_ENVIRONMENT = EcsFlat['service.environment'].name;

/**
 * The type of the service data is collected from.
 *
 * The type can be used to group and correlate logs and metrics from one service type.
 *
 * Example: If logs or metrics are collected from Elasticsearch, service.type would be elasticsearch.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-type
 */
export const ATTR_SERVICE_TYPE = EcsFlat['service.type'].name;

/**
 * Date/time when the event originated.
 *
 * This is the date/time extracted from the event, typically representing when the event was generated by the source.
 *
 * If the event source has no original timestamp, this value is typically populated by the first time the event was received by the pipeline.
 * Required field for all events.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-base.html#field-timestamp
 */
export const ATTR_TIMESTAMP = EcsFlat['@timestamp'].name;

/**
 * Unique identifier of the transaction within the scope of its trace.
 *
 * A transaction is the highest level of work measured within a service, such as a request to a server.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html#field-transaction-id
 */
export const ATTR_TRANSACTION_ID = EcsFlat['transaction.id'].name;

/**
 * Name of the device.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html#field-user-agent-device-name
 */
export const ATTR_USER_AGENT_DEVICE_NAME = EcsFlat['user_agent.device.name'].name;

/**
 * Operating system name, without the version.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html#ecs-user_agent-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-os.html
 */
export const ATTR_USER_AGENT_OS_NAME = EcsFlat['user_agent.os.name'].name;

/**
 * Operating system version as a raw string.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html#ecs-user_agent-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-os.html
 */
export const ATTR_USER_AGENT_OS_VERSION = EcsFlat['user_agent.os.version'].name;

// APM fields

/**
 * Hash of select properties of the logged error for grouping purposes.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-application-errors
 */
export const ATTR_ERROR_GROUPING_KEY = 'error.grouping_key' as const;

/**
 * The original error message.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-application-errors
 */
export const ATTR_ERROR_EXCEPTION_MESSAGE = 'error.exception.message' as const;

/**
 * The type of the original error, e.g. the Java exception class name.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-application-errors
 */
export const ATTR_ERROR_EXCEPTION_TYPE = 'error.exception.type' as const;

/**
 * Processor event.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/span.json
 */
export const ATTR_PROCESSOR_EVENT = 'processor.event' as const;

export const PROCESSOR_EVENT_VALUE_ERROR = 'error' as const;
export const PROCESSOR_EVENT_VALUE_METRIC = 'metric' as const;
export const PROCESSOR_EVENT_VALUE_TRANSACTION = 'transaction' as const;

/**
 * Total duration of this transaction, in microseconds.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/transaction.json
 */
export const ATTR_TRANSACTION_DURATION_US = 'transaction.duration.us' as const;

// These are used in the UX plugin
export const ATTR_NUMERIC_LABELS_INP_VALUE = 'numeric_labels.inp_value' as const;
export const ATTR_TRANSACTION_EXPERIENCE = 'transaction.experience' as const;
export const ATTR_TRANSACTION_EXPERIENCE_CLS = 'transaction.experience.cls' as const;
export const ATTR_TRANSACTION_EXPERIENCE_FID = 'transaction.experience.fid' as const;
export const ATTR_TRANSACTION_EXPERIENCE_TBT = 'transaction.experience.tbt' as const;

// These marks fields are used by the ux plugin.
// see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
export const ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT =
  'transaction.marks.agent.firstContentfulPaint' as const;
export const ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT =
  'transaction.marks.agent.largestContentfulPaint' as const;
export const ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE =
  'transaction.marks.agent.timeToFirstByte' as const;
export const ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START =
  'transaction.marks.navigationTiming.fetchStart' as const;

/**
 * Generic designation of a transaction in the scope of a single service (eg. GET /users/:id).
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/transaction.json
 */
export const ATTR_TRANSACTION_NAME = 'transaction.name' as const;

/**
 * Keyword of specific relevance in the service’s domain (eg. request, backgroundjob, etc)
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/transaction.json
 */
export const ATTR_TRANSACTION_TYPE = 'transaction.type' as const;

// This is used in the UX plugin
export const ATTR_TRANSACTION_URL = 'transaction.url' as const;

/**
 * Stacktrace ids from profiling.
 *
 * Only defined in the transaction proto and here.
 *
 * @see https://github.com/elastic/apm-data/blob/main/model/proto/transaction.proto
 */
export const ATTR_TRANSACTION_PROFILER_STACK_TRACE_IDS =
  'transaction.profiler_stack_trace_ids' as const;

// These are used in the exploratory_view plugin but not documented elsewhere
export const METRIC_SYSTEM_MEMORY_USAGE = 'system.memory.usage' as const;
export const METRIC_SYSTEM_CPU_USAGE = 'system.cpu.usage' as const;

// Profiling fields

export const ATTR_PROFILING_AGENT_CONFIG_PROBABILISTIC_THRESHOLD =
  'profiling.agent.config.probabilistic_threshold' as const;

export const ATTR_PROFILING_AGENT_START_TIME = 'profiling.agent.start_time' as const;

/**
 * @see https://github.com/rockdaboot/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-hosts.json
 */
export const ATTR_PROFILING_HOST_NAME = 'profiling.host.name' as const;

/**
 * @see https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json
 */
export const ATTR_PROFILING_PROJECT_ID = 'profiling.project.id' as const;

/**
 * @see https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json
 */
export const ATTR_STACKTRACE_COUNT = 'Stacktrace.count' as const;

/**
 * @see https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json
 */
export const ATTR_STACKTRACE_ID = 'Stacktrace.id' as const;
