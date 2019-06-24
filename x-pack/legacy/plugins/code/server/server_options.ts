/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { RepoConfig, RepoConfigs } from '../model';

export interface LspOptions {
  requestTimeoutMs: number;
  detach: boolean;
  verbose: boolean;
}

export interface SecurityOptions {
  enableMavenImport: boolean;
  enableGradleImport: boolean;
  installNodeDependency: boolean;
  gitHostWhitelist: string[];
  gitProtocolWhitelist: string[];
  enableGitCertCheck: boolean;
}

export class ServerOptions {
  public readonly workspacePath = resolve(this.config.get('path.data'), 'code/workspace');

  public readonly repoPath = resolve(this.config.get('path.data'), 'code/repos');

  public readonly credsPath = resolve(this.config.get('path.data'), 'code/credentials');

  public readonly jdtWorkspacePath = resolve(this.config.get('path.data'), 'code/jdt_ws');

  public readonly jdtConfigPath = resolve(this.config.get('path.data'), 'code/jdt_config');

  public readonly updateFrequencyMs: number = this.options.updateFrequencyMs;

  public readonly indexFrequencyMs: number = this.options.indexFrequencyMs;

  public readonly updateRepoFrequencyMs: number = this.options.updateRepoFrequencyMs;

  public readonly indexRepoFrequencyMs: number = this.options.indexRepoFrequencyMs;

  public readonly maxWorkspace: number = this.options.maxWorkspace;

  public readonly disableIndexScheduler: boolean = this.options.disableIndexScheduler;

  public readonly enableGlobalReference: boolean = this.options.enableGlobalReference;

  public readonly lsp: LspOptions = this.options.lsp;

  public readonly security: SecurityOptions = this.options.security;

  public readonly repoConfigs: RepoConfigs = (this.options.repos as RepoConfig[]).reduce(
    (previous, current) => {
      previous[current.repo] = current;
      return previous;
    },
    {} as RepoConfigs
  );

  public readonly enabled: boolean = this.options.enabled;

  public readonly codeNodeUrl: string = this.options.codeNodeUrl;

  constructor(private options: any, private config: any) {}
}
