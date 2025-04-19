/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getDockerComposeYaml({
  ports,
  env,
}: {
  ports: { phoenix: number; phoenixGrpc: number };
  env: Record<string, any>;
}) {
  const { phoenix, phoenixGrpc } = ports;

  return `
services:
  phoenix:
    image: arizephoenix/phoenix:latest # Must be greater than 4.0 version to work
    ports:
      - ${phoenix}:6006 # PHOENIX_PORT
      - ${phoenixGrpc}:4317 # PHOENIX_GRPC_PORT
    environment:
      - PHOENIX_WORKING_DIR=/mnt/data
      - PHOENIX_HOST=${env.PHOENIX_HOST}
      ${env.PHOENIX_SECRET ? `PHOENIX_SECRET=${env.PHOENIX_SECRET}` : ``}
      - PHOENIX_ENABLE_AUTH=${env.PHOENIX_ENABLE_AUTH}
      - PHOENIX_LOGGING_LEVEL=${env.PHOENIX_LOGGING_LEVEL}
      - PHOENIX_DB_LOGGING_LEVEL=${env.PHOENIX_DB_LOGGING_LEVEL}
      - PHOENIX_LOGGING_MODE=${env.PHOENIX_LOGGING_MODE}
    volumes:
      - phoenix_data:/mnt/data
volumes:
  phoenix_data:
    driver: local
`;
}
