/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Generates a Docker Compose configuration for running EDOT (Elastic Distribution of OpenTelemetry).
 *
 * @param collectorConfigPath - Path to the EDOT collector configuration file
 * @returns Docker Compose YAML configuration string
 */
export function getDockerComposeYaml({ collectorConfigPath }: { collectorConfigPath: string }) {
  return dedent(`
    services:
      otel-collector:
        image: docker.elastic.co/elastic-agent/elastic-otel-collector:9.0.0
        container_name: kibana-dev-edot
        restart: unless-stopped
        command: ["--config", "/etc/otelcol-config.yml"]
        volumes:
          - ${collectorConfigPath}:/etc/otelcol-config.yml:ro
        ports:
          - "4317:4317"
          - "4318:4318"
  `);
}
