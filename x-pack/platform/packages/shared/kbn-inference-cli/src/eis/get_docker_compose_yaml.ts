/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { EisGatewayConfig } from './get_eis_gateway_config';

export function getDockerComposeYaml({
  config,
}: {
  config: {
    eisGateway: EisGatewayConfig;
    nginx: {
      file: string;
    };
  };
}) {
  return dedent(`
    services:
      eis-gateway:
        image: ${config.eisGateway.image}
        expose:
          - "8443"
          - "8051"
        volumes:
          - "${config.eisGateway.mount.acl}:/app/acl/acl.yaml:ro"
          - "${config.eisGateway.mount.tls.cert}:/certs/tls/tls.crt:ro"
          - "${config.eisGateway.mount.tls.key}:/certs/tls/tls.key:ro"
          - "${config.eisGateway.mount.ca.cert}:/certs/ca/ca.crt:ro"
        environment:
          AWS_BEDROCK_API_ENDPOINT: "${config.eisGateway.aws.apiEndpoint}"
          AWS_BEDROCK_MODEL_ID: "${config.eisGateway.aws.modelId}"
          AWS_BEDROCK_REGION: "${config.eisGateway.aws.region}"
          AWS_BEDROCK_AWS_ACCESS_KEY_ID: "${config.eisGateway.aws.accessKeyId}"
          AWS_BEDROCK_AWS_SECRET_ACCESS_KEY: "${config.eisGateway.aws.secretAccessKey}"
          ACL_FILE_PATH: "/app/acl/acl.yaml"
          ENTITLEMENTS_SKIP_CHECK: "true"
          TELEMETRY_EXPORTER_TYPE: "none"
          TLS_VERIFY_CLIENT_CERTS: "false"
          LOGGER_LEVEL: "error"
        healthcheck:
          test: [
            'CMD-SHELL',
            'echo ''package main; import ("net/http";"os");func main(){resp,err:=http.Get("http://localhost:${config.eisGateway.ports[1]}/health");if err!=nil||resp.StatusCode!=200{os.Exit(1)}}'' > /tmp/health.go; go run /tmp/health.go',
          ]
          interval: 1s
          timeout: 2s
          retries: 10

      gateway-proxy:
        image: nginx:alpine
        ports:
          - "${config.eisGateway.ports[0]}:80"
        volumes:
          - ${config.nginx.file}:/etc/nginx/nginx.conf:ro
        depends_on:
          - eis-gateway
        healthcheck:
          test: ["CMD", "curl", "http://localhost:80/" ]
          interval: 1s
          timeout: 2s
          retries: 10
`);
}
