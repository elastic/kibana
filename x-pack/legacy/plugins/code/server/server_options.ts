/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { RepoConfig, RepoConfigs } from '../model';
import { CodeNode } from './distributed/cluster/code_nodes';

export interface LspOptions {
  requestTimeoutMs: number;
  detach: boolean;
  oomScoreAdj: boolean;
}

export interface SecurityOptions {
  enableMavenImport: boolean;
  enableGradleImport: boolean;
  installGoDependency: boolean;
  installNodeDependency: boolean;
  gitHostWhitelist: string[];
  gitProtocolWhitelist: string[];
  enableGitCertCheck: boolean;
}

export interface DiskOptions {
  thresholdEnabled: boolean;
  watermarkLow: string;
}

export class ServerOptions {
  public readonly workspacePath = resolve(this.config.get('path.data'), 'code/workspace');

  public readonly repoPath = resolve(this.config.get('path.data'), 'code/repos');

  public readonly credsPath = resolve(this.config.get('path.data'), 'code/credentials');

  public readonly jdtWorkspacePath = resolve(this.config.get('path.data'), 'code/jdt_ws');

  public readonly jdtConfigPath = resolve(this.config.get('path.data'), 'code/jdt_config');

  public readonly goPath = resolve(this.config.get('path.data'), 'code/gopath');

  public readonly updateFrequencyMs: number = this.options.updateFrequencyMs;

  public readonly indexFrequencyMs: number = this.options.indexFrequencyMs;

  public readonly updateRepoFrequencyMs: number = this.options.updateRepoFrequencyMs;

  public readonly indexRepoFrequencyMs: number = this.options.indexRepoFrequencyMs;

  public readonly maxWorkspace: number = this.options.maxWorkspace;

  public readonly enableGlobalReference: boolean = this.options.enableGlobalReference;

  public readonly enableCommitIndexing: boolean = this.options.enableCommitIndexing;

  public readonly lsp: LspOptions = this.options.lsp;

  public readonly security: SecurityOptions = this.options.security;

  public readonly disk: DiskOptions = this.options.disk;

  public readonly repoConfigs: RepoConfigs = (this.options.repos as RepoConfig[]).reduce(
    (previous, current) => {
      previous[current.repo] = current;
      return previous;
    },
    {} as RepoConfigs
  );

  public readonly enabled: boolean = this.options.enabled;

  public readonly codeNodeUrl: string = this.options.codeNodeUrl;

  public readonly clusterEnabled: boolean = this.options.clustering.enabled;

  public readonly codeNodes: CodeNode[] = this.options.clustering.codeNodes;

  constructor(private options: any, private config: any) {}

  /**
   * TODO 'server.uuid' is not guaranteed to be loaded when the object is constructed.
   *
   * See [[manageUuid()]], as it was called asynchronously without actions on the completion.
   */
  public get serverUUID(): string {
    return this.config.get('server.uuid');
  }

  public get localAddress(): string {
    const serverCfg = this.config.get('server');
    return 'http://' + serverCfg.host + ':' + serverCfg.port + serverCfg.basePath;
  }
}
