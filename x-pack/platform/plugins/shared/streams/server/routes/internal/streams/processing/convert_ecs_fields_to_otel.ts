/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * THESE MAPPINGS HAVE BEEN GENERATED FROM THE ECS DOCUMENTATION - DO NOT MODIFY MANUALLY!
 *
 * See `x-pack/platform/plugins/shared/streams/scripts/create_otel_mappings.ts` for the script that generates these mappings.
 */

/**
 * The name of the ECS field is identical to the SemConv attribute name and has (practically) the same semantics.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const MATCH_FIELDS: string[] = [
  'client.address',
  'client.port',
  'cloud.account.id',
  'cloud.availability_zone',
  'cloud.provider',
  'cloud.region',
  'container.id',
  'container.image.name',
  'container.name',
  'container.runtime',
  'destination.address',
  'destination.port',
  'device.id',
  'device.manufacturer',
  'device.model.identifier',
  'device.model.name',
  'dns.question.name',
  'error.type',
  'faas.coldstart',
  'faas.name',
  'faas.version',
  'file.accessed',
  'file.attributes',
  'file.created',
  'file.directory',
  'file.extension',
  'file.fork_name',
  'file.inode',
  'file.mode',
  'file.name',
  'file.path',
  'file.size',
  'geo.postal_code',
  'host.id',
  'host.ip',
  'host.mac',
  'host.name',
  'host.type',
  'http.response.status_code',
  'log.file.path',
  'network.transport',
  'network.type',
  'os.name',
  'os.version',
  'process.args_count',
  'process.command_line',
  'process.real_user.id',
  'process.saved_user.id',
  'process.user.id',
  'process.interactive',
  'process.real_user.name',
  'process.saved_user.name',
  'process.user.name',
  'process.group_leader.pid',
  'process.pid',
  'process.session_leader.pid',
  'process.title',
  'process.vpid',
  'process.working_directory',
  'server.address',
  'server.port',
  'service.name',
  'service.version',
  'source.address',
  'source.port',
  'tls.cipher',
  'tls.client.certificate',
  'tls.client.certificate_chain',
  'tls.client.hash.md5',
  'tls.client.hash.sha1',
  'tls.client.hash.sha256',
  'tls.client.issuer',
  'tls.client.ja3',
  'tls.client.not_after',
  'tls.client.not_before',
  'tls.client.subject',
  'tls.client.supported_ciphers',
  'tls.curve',
  'tls.established',
  'tls.next_protocol',
  'tls.resumed',
  'tls.server.certificate',
  'tls.server.certificate_chain',
  'tls.server.hash.md5',
  'tls.server.hash.sha1',
  'tls.server.hash.sha256',
  'tls.server.issuer',
  'tls.server.ja3s',
  'tls.server.not_after',
  'tls.server.not_before',
  'tls.server.subject',
  'url.domain',
  'url.extension',
  'url.fragment',
  'url.full',
  'url.original',
  'url.path',
  'url.port',
  'url.query',
  'url.registered_domain',
  'url.scheme',
  'url.subdomain',
  'url.top_level_domain',
  'user.email',
  'user.full_name',
  'user.hash',
  'user.id',
  'user.name',
  'user.roles',
  'user_agent.name',
  'user_agent.original',
  'user_agent.version',
];

/**
 * The ECS field name is different but has the same semantics as the corresponding SemConv attribute.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const EQUIVALENT_FIELDS: Record<string, string> = {
  'cloud.service.name': 'cloud.platform',
  'container.image.hash.all': 'container.image.repo_digests',
  'container.image.tag': 'container.image.tags',
  'error.message': 'exception.message',
  'error.stack_trace': 'exception.stacktrace',
  'faas.execution': 'faas.invocation_id',
  'faas.trigger.type': 'faas.trigger',
  'file.ctime': 'file.changed',
  'file.gid': 'file.group.id',
  'file.group': 'file.group.name',
  'file.mtime': 'file.modified',
  'file.owner': 'file.owner.name',
  'file.target_path': 'file.symbolic_link.target_path',
  'file.uid': 'file.owner.id',
  'geo.city_name': 'geo.locality.name',
  'geo.continent_code': 'geo.continent.code',
  'geo.country_iso_code': 'geo.country.iso_code',
  'geo.region_iso_code': 'geo.region.iso_code',
  'host.architecture': 'host.arch',
  'http.request.body.bytes': 'http.request.body.size',
  'http.request.bytes': 'http.request.size',
  'http.request.method': 'http.request.method_original',
  'http.response.body.bytes': 'http.response.body.size',
  'http.response.bytes': 'http.response.size',
  'network.protocol': 'network.protocol.name',
  'os.full': 'os.description',
  'process.args': 'process.command_args',
  'process.executable': 'process.executable.path',
  'service.environment': 'deployment.environment.name',
  'service.node.name': 'service.instance.id',
};

/**
 * The ECS field has a corresponding representation in OpenTelemetry’s protocol definition.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const OTLP_FIELDS: Record<string, string> = {
  'log.level': 'severity_text',
  'span.id': 'span_id',
  'trace.id': 'trace_id',
};

/**
 * The set of ECS (Elastic Common Schema) field names that are mapped to OpenTelemetry resource attributes, as defined by the OpenTelemetry Semantic Conventions.
 *
 * See https://github.com/elastic/elasticsearch/blob/main/modules/ingest-otel/src/main/java/org/elasticsearch/ingest/otel/EcsOTelResourceAttributes.java
 */
const RESOURCE_FIELDS: string[] = [
  'agent.type',
  'agent.build.original',
  'agent.name',
  'agent.id',
  'agent.ephemeral_id',
  'agent.version',
  'container.image.tag',
  'device.model.identifier',
  'container.image.hash.all',
  'service.node.name',
  'process.pid',
  'device.id',
  'host.mac',
  'host.type',
  'container.id',
  'cloud.availability_zone',
  'host.ip',
  'container.name',
  'container.image.name',
  'device.model.name',
  'host.name',
  'host.id',
  'process.executable',
  'user_agent.original',
  'service.environment',
  'cloud.region',
  'service.name',
  'faas.name',
  'device.manufacturer',
  'process.args',
  'host.architecture',
  'cloud.provider',
  'container.runtime',
  'service.version',
  'cloud.service.name',
  'cloud.account.id',
  'process.command_line',
  'faas.version',
];

/**
 * Maps ECS field to corresponding OTel semantic convention attribute.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
export function getOtelFieldName(ecsFieldName: string): string {
  if (ecsFieldName === '@timestamp') {
    return `@timestamp`; // Special case for `@timestamp` field which should be kept as is.
  }
  if (ecsFieldName === 'message') {
    return `body.text`; // Special case for `message` field which should be stored as `body.text` instead of `body` (SemConv).
  }
  if (OTLP_FIELDS[ecsFieldName]) {
    return `${OTLP_FIELDS[ecsFieldName]}`; // OTLP fields are mapped to their OTLP counterparts and stored in the root of the document.
  }
  const prefix = RESOURCE_FIELDS.includes(ecsFieldName) ? `resource.attributes` : `attributes`; // Resource fields are stored under `resource.attributes`, all other fields under `attributes`.
  if (MATCH_FIELDS.includes(ecsFieldName)) {
    return `${prefix}.${ecsFieldName}`; // Match fields are kept as is
  }
  if (EQUIVALENT_FIELDS[ecsFieldName]) {
    return `${prefix}.${EQUIVALENT_FIELDS[ecsFieldName]}`; // Equivalent fields are mapped to their SemConv counterparts
  }
  return `${prefix}.${ecsFieldName}`; // All other fields (unknown/conflict) are stored as custom attributes.
}

/**
 * Will match %{SYNTAX}, %{SYNTAX:SEMANTIC}, %{SYNTAX:SEMANTIC:TYPE}, and support special characters and dots.
 */
export const SUBPATTERNS_REGEX =
  /%\{([A-Z0-9_@#$%&*+=\-\.]+)(?::([A-Za-z0-9_@#$%&*+=\-\.]+))?(?::([A-Za-z]+))?\}/g;

/**
 * Maps ECS fields in Grok patterns to OpenTelemetry semantic convention.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
export function convertEcsFieldsToOtel(grokPattern: string): string {
  return grokPattern.replace(
    SUBPATTERNS_REGEX,
    (match, pattern: string, field?: string, type?: string) => {
      if (!field) {
        return match; // No field, return as is
      }
      return `%{${pattern}:${getOtelFieldName(field)}${type ? `:${type}` : ''}}`;
    }
  );
}
