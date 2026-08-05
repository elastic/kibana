/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PackageSpecIcon } from '../../../../../../../common/types';

export interface IntegrationGroup {
  title: string;
  description: string;
  icons: PackageSpecIcon[];
}

/**
 * Static descriptors for the initial set of integration collection tiles.
 * Keys match the `group` field value in the member package manifests.
 * Adding a new group requires a corresponding PR to elastic/integrations to tag
 * the member packages with `group: <id>` in their manifests.
 */
export const INTEGRATION_GROUPS: Record<string, IntegrationGroup> = {
  nginx: {
    title: i18n.translate('xpack.fleet.integrationGroups.nginx.title', {
      defaultMessage: 'Nginx',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.nginx.description', {
      defaultMessage:
        'Collect logs and metrics from Nginx web servers using Elastic Agent. Choose from ECS-based, OTel-based, or Nginx Ingress Controller collection.',
    }),
    icons: [],
  },
  redis: {
    title: i18n.translate('xpack.fleet.integrationGroups.redis.title', {
      defaultMessage: 'Redis',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.redis.description', {
      defaultMessage:
        'Collect logs and metrics from Redis using Elastic Agent. Choose from Redis (OSS) or Redis Enterprise collection.',
    }),
    icons: [],
  },
  prometheus: {
    title: i18n.translate('xpack.fleet.integrationGroups.prometheus.title', {
      defaultMessage: 'Prometheus',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.prometheus.description', {
      defaultMessage:
        'Collect metrics from Prometheus endpoints using Elastic Agent. Choose from direct scraping or OpenTelemetry Collector-based collection.',
    }),
    icons: [],
  },
  mysql: {
    title: i18n.translate('xpack.fleet.integrationGroups.mysql.title', {
      defaultMessage: 'MySQL',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.mysql.description', {
      defaultMessage:
        'Collect logs and metrics from MySQL using Elastic Agent. Choose from MySQL, MySQL Enterprise, or OTel-based collection.',
    }),
    icons: [],
  },
  kafka: {
    title: i18n.translate('xpack.fleet.integrationGroups.kafka.title', {
      defaultMessage: 'Kafka',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.kafka.description', {
      defaultMessage:
        'Collect logs and metrics from Apache Kafka using Elastic Agent. Choose from ECS-based, OTel-based, Kafka Connect, or log consumer collection.',
    }),
    icons: [],
  },
  iis: {
    title: i18n.translate('xpack.fleet.integrationGroups.iis.title', {
      defaultMessage: 'IIS',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.iis.description', {
      defaultMessage:
        'Collect logs and metrics from Microsoft Internet Information Services (IIS) using Elastic Agent. Choose from ECS-based or OTel-based collection.',
    }),
    icons: [],
  },
  docker: {
    title: i18n.translate('xpack.fleet.integrationGroups.docker.title', {
      defaultMessage: 'Docker',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.docker.description', {
      defaultMessage:
        'Collect logs and metrics from Docker containers using Elastic Agent. Choose from ECS-based or OTel-based collection.',
    }),
    icons: [],
  },
  apache: {
    title: i18n.translate('xpack.fleet.integrationGroups.apache.title', {
      defaultMessage: 'Apache',
    }),
    description: i18n.translate('xpack.fleet.integrationGroups.apache.description', {
      defaultMessage:
        'Collect logs and metrics from Apache technologies using Elastic Agent. Choose from Apache HTTP Server, Apache Tomcat, or Apache Spark collection.',
    }),
    icons: [],
  },
};
