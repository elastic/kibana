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
export const LINKS_TRACE_ID = 'links.trace_id';
export const LINKS_SPAN_ID = 'links.span_id';
export const ATTRIBUTE_HTTP_SCHEME = 'attributes.http.scheme';
export const ATTRIBUTE_HTTP_STATUS_CODE = 'attributes.http.status_code';
export const PROCESS_RUNTIME_VERSION = 'process.runtime.version';
export const K8S_POD_NAME = 'k8s.pod.name';
export const K8S_NODE_NAME = 'k8s.node.name';
export const K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';
export const K8S_CLUSTER_NAME = 'k8s.cluster.name';

// GenAI OTel semantic conventions (EDOT/OTel-native ingest: attributes.* prefix)
export const ATTRIBUTE_GEN_AI_OPERATION_NAME = 'attributes.gen_ai.operation.name';
export const ATTRIBUTE_GEN_AI_PROVIDER_NAME = 'attributes.gen_ai.provider.name';
export const ATTRIBUTE_GEN_AI_SYSTEM = 'attributes.gen_ai.system';
export const ATTRIBUTE_GEN_AI_REQUEST_MODEL = 'attributes.gen_ai.request.model';
export const ATTRIBUTE_GEN_AI_REQUEST_TEMPERATURE = 'attributes.gen_ai.request.temperature';
export const ATTRIBUTE_GEN_AI_REQUEST_TOP_P = 'attributes.gen_ai.request.top_p';
export const ATTRIBUTE_GEN_AI_REQUEST_TOP_K = 'attributes.gen_ai.request.top_k';
export const ATTRIBUTE_GEN_AI_REQUEST_MAX_TOKENS = 'attributes.gen_ai.request.max_tokens';
export const ATTRIBUTE_GEN_AI_REQUEST_SEED = 'attributes.gen_ai.request.seed';
export const ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS = 'attributes.gen_ai.usage.input_tokens';
export const ATTRIBUTE_GEN_AI_USAGE_OUTPUT_TOKENS = 'attributes.gen_ai.usage.output_tokens';
export const ATTRIBUTE_GEN_AI_RESPONSE_MODEL = 'attributes.gen_ai.response.model';
export const ATTRIBUTE_GEN_AI_RESPONSE_ID = 'attributes.gen_ai.response.id';
export const ATTRIBUTE_GEN_AI_RESPONSE_FINISH_REASONS = 'attributes.gen_ai.response.finish_reasons';
export const ATTRIBUTE_GEN_AI_INPUT_MESSAGES = 'attributes.gen_ai.input.messages';
export const ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES = 'attributes.gen_ai.output.messages';
export const ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS = 'attributes.gen_ai.system_instructions';
export const ATTRIBUTE_GEN_AI_CONVERSATION_ID = 'attributes.gen_ai.conversation.id';
export const ATTRIBUTE_GEN_AI_TOOL_DEFINITIONS = 'attributes.gen_ai.tool.definitions';
export const ATTRIBUTE_GEN_AI_TOOL_NAME = 'attributes.gen_ai.tool.name';
export const ATTRIBUTE_GEN_AI_TOOL_CALL_ARGUMENTS = 'attributes.gen_ai.tool.call.arguments';
export const ATTRIBUTE_GEN_AI_TOOL_CALL_RESULT = 'attributes.gen_ai.tool.call.result';
