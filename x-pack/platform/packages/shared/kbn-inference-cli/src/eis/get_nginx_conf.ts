/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { EisGatewayConfig } from './get_eis_gateway_config';

export function getNginxConf({ eisGatewayConfig }: { eisGatewayConfig: EisGatewayConfig }) {
  return dedent(`error_log /dev/stderr error; 
events {}

http {
  access_log off;
  
  upstream eis_gateway {
    server eis-gateway:${eisGatewayConfig.ports[0]};
  }

  server {
    listen 80;

    location / {
      proxy_pass https://eis_gateway;
      # Disable SSL verification since we're using self-signed certs
      proxy_ssl_verify off;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}`);
}
