/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A selection of fields derived from
// https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html
const ecsFields = [
  // Base fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-base.html
  // Only picking `tags` here since `@timestamp` is not applicable,
  // `message` is part of text field candidates and `label` acts
  // as a prefix which we'll handle in filterByECSFields.
  'tags',

  // Agent fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-agent.html
  'agent.name',
  'agent.type',
  'agent.version',

  // Client fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-client.html
  'client.domain',
  'client.ip', // of type IP
  'client.port',

  // Cloud fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-cloud.html
  'cloud.account.id',
  'cloud.account.name',
  'cloud.availability_zone',
  'cloud.instance.id', // Instance ID in the cloud environment
  'cloud.machine.type', // Type of the cloud machine
  'cloud.project.id',
  'cloud.provider', // Name of the cloud provider
  'cloud.region', // Region in which the host is running
  'cloud.service.name',

  // Container fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-container.html
  'container.id', // Unique identifier of the container
  'container.image.hash.all',
  'container.image.name',
  'container.image.tag',
  'container.name', // Name of the container
  'container.runtime',
  'container.security_context.privileged', // boolean type

  // Data Stream fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-data_stream.html
  'data_stream.dataset',
  'data_stream.namespace',
  'data_stream.type',

  // Destination fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-destination.html
  'destination.address',

  // ECS fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-ecs.html
  'ecs.version',

  // Error fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-error.html
  'error.code',
  'error.id',
  'error.type',

  // Event fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-event.html
  'event.action',
  'event.agent_id_status',
  'event.category',
  'event.code',
  'event.dataset',
  'event.kind',
  'event.module',
  'event.outcome',
  'event.provider',
  'event.reason',
  'event.reference',
  'event.timezone',
  'event.type',
  'event.url',

  // File fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-file.html
  'file.attributes',
  'file.path',
  'file.type',

  // Host fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-host.html
  'host.architecture',
  'host.domain',
  'host.ip',
  'host.name',

  // HTTP fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-http.html
  'http.request.method',
  'http.request.mime_type',
  'http.request.referrer',
  'http.response.mime_type',
  'http.response.status_code',
  'http.version',

  // Log fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-log.html
  'log.file.path',
  'log.level',
  'log.logger',
  'log.origin.file.name',
  'log.origin.function',

  // Network fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-network.html
  'network.application',
  'network.direction',
  'network.name',
  'network.protocol',
  'network.type',

  // Orchestrator fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-orchestrator.html
  'orchestrator.cluster.name',
  'orchestrator.cluster.version',
  'orchestrator.namespace',
  'orchestrator.organization',
  'orchestrator.type',

  // Process fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-process.html
  'process.command_line',
  'process.env_vars',
  'process.name',

  // Rule fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-rule.html
  'rule.author',
  'rule.category',
  'rule.description',
  'rule.name',
  'rule.ruleset',
  'rule.version',

  // Server fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-server.html
  'server.domain',
  'server.ip', // IP field
  'server.port',

  // Service fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-service.html
  'service.environment',
  'service.name',
  'service.node.name',
  'service.node.role', // deprecated
  'service.node.roles',
  'service.state',
  'service.type',
  'service.version',

  // Source fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-source.html
  'source.domain',
  'source.ip', // IP field
  'source.port',

  // URL fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-url.html
  'url.domain',
  'url.full',

  // User fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-user.html
  'user.name',
  'user.domain',
  'user.email',
  'user.roles',

  // User agent fields
  // https://www.elastic.co/guide/en/ecs/current/ecs-user_agent.html
  'user_agent.device.name',
  'user_agent.name',
  'user_agent.original',
  'user_agent.version',
];

// Must have field to identify an index as ECS compliant.
// The only other field that's required is `@timestamp` but that's not
// part of the list since it's not a field that can be used for analysis.
// https://www.elastic.co/guide/en/ecs/1.12/ecs-ecs.html
const ecsIdentifierField = 'ecs.version';

// These are the fields that are expected to be nested within other ECS fields.
const ecsPostfixes = [
  // For geo fields, we default to the more human readable variants.
  // Those are supposed to be used nested within e.g. `client.*` that's
  // why we cannot have them in the `ecsFields` array.
  // https://www.elastic.co/guide/en/ecs/current/ecs-geo.html
  '.geo.city_name',
  '.geo.continent_name',
  '.geo.country_name',
  '.geo.region_name',
  '.geo.timezone',

  // The os fields are expected to be nested at: host.os, observer.os, user_agent.os
  // https://www.elastic.co/guide/en/ecs/current/ecs-os.html
  '.os.family',
  '.os.full',
  '.os.kernel',
  '.os.name',
  '.os.platform',
  '.os.version',

  // The risk fields are expected to be nested at: host.risk, user.risk
  // https://www.elastic.co/guide/en/ecs/current/ecs-risk.html
  '.risk.calculated_level',
  '.risk.static_level',

  // User fields are also in the ECS fields array but can be nested too.
  '.user.domain',
  '.user.email',
  '.user.roles',
];

export function containsECSIdentifierField(fieldsArray: string[]): boolean {
  return fieldsArray.includes(ecsIdentifierField);
}

export function filterByECSFields(fieldsArray: string[]) {
  return fieldsArray.filter(
    (field) =>
      ecsFields.includes(field) ||
      field.startsWith('label.') ||
      ecsPostfixes.some((postfix) => field.endsWith(postfix))
  );
}
