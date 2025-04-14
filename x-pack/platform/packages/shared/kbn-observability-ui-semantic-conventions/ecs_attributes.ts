/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Custom name of the agent.
 *
 * This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-agent.html#field-agent-name
 */
export const ATTR_AGENT_NAME = 'agent.name' as const;

/**
 * Type of the agent.
 *
 * The agent type always stays the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-agent.html#field-agent-type
 */
export const ATTR_AGENT_TYPE = 'agent.type' as const;

/**
 * Country ISO code.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-client.html#ecs-client-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-country-iso-code
 */
export const ATTR_CLIENT_GEO_COUNTRY_ISO_CODE = 'client.geo.country_iso_code' as const;

/**
 * Country name.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-client.html#ecs-client-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-country-name
 */
export const ATTR_CLIENT_GEO_COUNTRY_NAME = 'client.geo.country_name' as const;

/**
 * Country ISO code.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-client.html#ecs-client-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-geo.html#field-geo-region-iso-code
 */
export const ATTR_CLIENT_GEO_REGION_ISO_CODE = 'client.geo.region_iso_code' as const;

/**
 * An overarching type for the data stream.
 * Currently allowed values are "logs" and "metrics". We expect to also add "traces" and "synthetics" in the near future.
 
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-data_stream.html#field-data-stream-type
 */
export const ATTR_DATA_STREAM_TYPE = 'data_stream.type' as const;

/**
 * Name of the dataset.
 *
 * If an event source publishes more than one type of log or events (e.g. access log, error log), the dataset is used to specify which one the event comes from.
 *
 * It’s recommended but not required to start the dataset name with the module name, followed by a dot, then the dataset name.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-dataset
 */
export const ATTR_EVENT_DATASET = 'event.dataset' as const;

/**
 * Hostname of the host.
 *
 * It normally contains what the hostname command returns on the host machine.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-hostname
 */
export const ATTR_HOST_HOSTNAME = 'host.hostname' as const;

/**
 * Operating system name, including the version or code name.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-host.html#ecs-host-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-os.html#field-os-full
 */
export const ATTR_HOST_OS_FULL = 'host.os.full' as const;

/**
 * Operating system platform (such centos, ubuntu, windows).
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-host.html#ecs-host-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-os.html#field-os-platform
 */
export const ATTR_HOST_OS_PLATFORM = 'host.os.platform' as const;

/**
 * For log events the message field contains the log message, optimized for viewing in a log viewer.
 *
 * For structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event.
 *
 * If multiple messages exist, they can be combined into one message.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-base.html#field-message
 */
export const ATTR_MESSAGE = 'message' as const;

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
export const ATTR_OBSERVER_GEO_NAME = 'observer.geo.name' as const;

/**
 * Name of the resource being acted upon.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-orchestrator.html#field-orchestrator-resource-name
 */
export const ATTR_ORCHESTRATOR_RESOURCE_NAME = 'orchestrator.resource.name' as const;

/**
 * Thread name.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-thread-name
 */
export const ATTR_PROCESS_THREAD_NAME = 'process.thread.name' as const;

/**
 * [beta] This field is beta and subject to change.
 *
 * Identifies the environment where the service is running.
 *
 * If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-environment
 */
export const ATTR_SERVICE_ENVIRONMENT = 'service.environment' as const;

/**
 * The type of the service data is collected from.
 *
 * The type can be used to group and correlate logs and metrics from one service type.
 *
 * Example: If logs or metrics are collected from Elasticsearch, service.type would be elasticsearch.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-service.html#field-service-type
 */
export const ATTR_SERVICE_TYPE = 'service.type' as const;

/**
 * List of keywords used to tag each event.
 *
 * Note: this field should contain an array of values.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-base.html#field-tags
 */
export const ATTR_TAGS = 'tags' as const;

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
export const ATTR_TIMESTAMP = '@timestamp' as const;

/**
 * Unique identifier of the transaction within the scope of its trace.
 *
 * A transaction is the highest level of work measured within a service, such as a request to a server.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html#field-transaction-id
 */
export const ATTR_TRANSACTION_ID = 'transaction.id' as const;

/**
 * Port of the request, such as 443.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-url.html#field-url-port
 */
export const ATTR_URL_PORT = 'url.port' as const;

/**
 * Name of the device.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html#field-user-agent-device-name
 */
export const ATTR_USER_AGENT_DEVICE_NAME = 'user_agent.device.name' as const;

/**
 * Operating system name, without the version.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html#ecs-user_agent-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-os.html
 */
export const ATTR_USER_AGENT_OS_NAME = 'user_agent.os.name' as const;

/**
 * Operating system version as a raw string.
 *
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html#ecs-user_agent-nestings
 * @see https://www.elastic.co/guide/en/ecs/current/ecs-os.html
 */
export const ATTR_USER_AGENT_OS_VERSION = 'user_agent.os.version' as const;
