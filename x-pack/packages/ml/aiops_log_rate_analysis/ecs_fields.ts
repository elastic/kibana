/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ecsFields = [
  // general fields
  'ecs.version',
  'data_stream.dataset',
  'event.category',
  'event.action',
  'event.module',
  'event.dataset',
  'event.kind',
  'event.severity',
  'event.timezone',
  'event.type',
  'fileset.name',
  'host.architecture',
  'host.name',
  'host.ip',
  'host.os.codename',
  'host.os.family',
  'host.os.kernel',
  'host.os.name',
  'host.os.platform',
  'host.os.type',
  'host.os.version',
  'input.type',
  'process.name',
  'process.executable',
  'user.name',
  'service.name',
  'service.type',
  'service.runtime.name',
  'service.runtime.version',
  'log.file.path',
  'log.flags',
  'log.level',
  'log.logger',
  'log.origin.file.name',
  'log.origin.function',
  'log.original',
  'source.address',
  'destination.address',
  'http.request.method',
  'url.domain',
  'network.protocol',
  'file.path',
  'observer.name',
  'agent.name',
  'agent.type',
  'agent.version',

  // infrastructure fields
  'cloud.availability_zone',
  'cloud.project.id',
  'cloud.service.name',
  'cloud.provider', // Name of the cloud provider
  'cloud.region', // Region in which the host is running
  'cloud.instance.id', // Instance ID in the cloud environment
  'cloud.instance.name', // Name of the cloud instance
  'cloud.machine.type', // Type of the cloud machine
  'container.id', // Unique identifier of the container
  'container.name', // Name of the container
  'container.image.name',
  'container.runtime',
  'orchestrator.cluster.name', // Name of the orchestrator cluster
  'orchestrator.namespace', // Namespace of the orchestrator
  'orchestrator.type', // Type of orchestrator (e.g., Kubernetes, Mesos)

  // web/http related fields
  'user_agent.original', // Original user agent string
  'user_agent.name', // Name of the user agent
  'http.request.method', // HTTP request method

  // APM
  'transaction.name',

  // Geo
  'client.geo.city_name',
  'client.geo.continent_name',
  'client.geo.country_iso_code',
  'client.geo.country_name',
  'client.geo.region_iso_code',
  'client.geo.region_name',

  // IP fields
  'source.ip',
  'destination.ip',
  'client.ip',
  'server.ip',
  'host.ip',

  // Boolean fields
  'event.outcome',
  'event.success',
  'network.direction',
  'process.parent.executable',
  'tls.established',
];

const ecsFieldsMustHave = [
  'host.name', // Name of the host where the event originated
  'service.name', // Name of the service generating the event
  'log.level', // Severity level of the log event
];

export function containsECSIdentifierFields(fieldsArray: string[]): boolean {
  return ecsFieldsMustHave.every((d) => fieldsArray.includes(d));
}

export function filterByECSFields(fieldsArray: string[]) {
  return fieldsArray.filter((field) => ecsFields.includes(field) || field.startsWith('label.'));
}
