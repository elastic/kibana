/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { kibanaPackageJson } from '@kbn/repo-info';

export interface GeneratedAgent {
  agentId: string;
  elasticAgentId: string;
  hostName: string;
  hostIp: string;
  policyId: string;
}

export interface OsqueryDataGeneratorOptions {
  seed?: string;
  policyId?: string;
  kibanaVersion?: string;
}

/**
 * Typed generator for osquery Scout data-loader helpers.
 * Mirrors the shape used by `EndpointDocGenerator` / `FleetAgentGenerator` in
 * security_solution so the pattern is familiar to reviewers.
 */
export class OsqueryDataGenerator {
  private readonly policyId: string;

  private readonly kibanaVersion: string;

  constructor({ policyId, kibanaVersion }: OsqueryDataGeneratorOptions = {}) {
    this.policyId = policyId ?? uuidV4();
    this.kibanaVersion = kibanaVersion ?? kibanaPackageJson.version;
  }

  generateAgent(overrides: Partial<GeneratedAgent> = {}): GeneratedAgent {
    const agentId = overrides.agentId ?? uuidV4();

    return {
      agentId,
      elasticAgentId: overrides.elasticAgentId ?? agentId,
      hostName: overrides.hostName ?? `scout-osquery-host-${agentId.slice(0, 8)}`,
      hostIp: overrides.hostIp ?? `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      policyId: overrides.policyId ?? this.policyId,
    };
  }

  generateAgents(count: number): GeneratedAgent[] {
    return Array.from({ length: count }, () => this.generateAgent());
  }

  generateTimestamp(offsetMs: number = 365 * 24 * 60 * 60 * 1000): string {
    return new Date(Date.now() + offsetMs).toISOString();
  }

  public get defaultPolicyId(): string {
    return this.policyId;
  }

  public get version(): string {
    return this.kibanaVersion;
  }
}
