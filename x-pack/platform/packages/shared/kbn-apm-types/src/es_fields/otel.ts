/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_CODE = 'status.code';
export const OTEL_EVENT_NAME = 'event_name';
export const EXCEPTION_TYPE = 'exception.type';
export const EXCEPTION_MESSAGE = 'exception.message';
export const DURATION = 'duration';
export const KIND = 'kind';
export const RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE =
  'resource.attributes.telemetry.sdk.language';
// OTel semconv >= 1.27 replacement for `deployment.environment`. The otel-data index templates
// alias `service.environment` only to the deprecated attribute, so this field must be queried explicitly.
export const RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME =
  'resource.attributes.deployment.environment.name';
export const LINKS_TRACE_ID = 'links.trace_id';
export const LINKS_SPAN_ID = 'links.span_id';
export const ATTRIBUTE_HTTP_SCHEME = 'attributes.http.scheme';
export const ATTRIBUTE_HTTP_STATUS_CODE = 'attributes.http.status_code';
// gRPC status code: OTel-native ingest uses the attributes.* prefix, classic APM the bare field
export const ATTRIBUTE_RPC_GRPC_STATUS_CODE = 'attributes.rpc.grpc.status_code';
export const RPC_GRPC_STATUS_CODE = 'rpc.grpc.status_code';
export const PROCESS_RUNTIME_VERSION = 'process.runtime.version';
export const K8S_POD_NAME = 'k8s.pod.name';
export const K8S_NODE_NAME = 'k8s.node.name';
export const K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';
export const K8S_CLUSTER_NAME = 'k8s.cluster.name';
