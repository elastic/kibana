/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticCliAccess } from './elastic_cli_credential_minter';
import type { SandboxCliCredentialRequest } from './sandbox_cli_credential_resolver';

export interface SandboxCredentialRequest {
  cli?: SandboxCliCredentialRequest[];
  elastic?: {
    kibana?: ElasticCliAccess;
    elasticsearch?: ElasticCliAccess;
  };
}
