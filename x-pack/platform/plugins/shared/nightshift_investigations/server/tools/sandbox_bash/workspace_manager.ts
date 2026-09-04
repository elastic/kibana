/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxConnectionManager } from './grpc_client';
import { presignS3Url } from './s3_presigner';
import type { NightshiftInvestigationsConfig } from '../../config';

type SandboxConfig = NonNullable<NightshiftInvestigationsConfig['sandbox']>;

interface WorkspaceManagerParams {
  config: SandboxConfig;
  connectionManager: SandboxConnectionManager;
  logger: Logger;
}

export class WorkspaceManager {
  private readonly config: SandboxConfig;
  private readonly connectionManager: SandboxConnectionManager;
  private readonly logger: Logger;

  constructor({ config, connectionManager, logger }: WorkspaceManagerParams) {
    this.config = config;
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  isEnabled(): boolean {
    return !!(
      this.config.sandbox_workspace_bucket &&
      this.config.s3_access_key_id &&
      this.config.s3_secret_access_key
    );
  }

  private objectKey(conversationId: string): string {
    return `workspace-snapshots/${conversationId}.tar.gz`;
  }

  private presign(method: 'GET' | 'PUT' | 'HEAD', conversationId: string): string {
    // For HEAD checks from Kibana, use s3_endpoint. For sandbox PUT/GET, use
    // s3_sandbox_endpoint (falls back to s3_endpoint) so that containers can reach
    // MinIO even when the host URL isn't resolvable from inside Docker.
    const endpoint =
      method === 'HEAD'
        ? (this.config.s3_endpoint ?? 'https://s3.amazonaws.com')
        : (this.config.s3_sandbox_endpoint ?? this.config.s3_endpoint ?? 'https://s3.amazonaws.com');
    return presignS3Url({
      endpoint,
      bucket: this.config.sandbox_workspace_bucket!,
      key: this.objectKey(conversationId),
      method,
      accessKeyId: this.config.s3_access_key_id!,
      secretAccessKey: this.config.s3_secret_access_key!,
      region: this.config.s3_region,
      expiresIn: 3600,
    });
  }

  private async objectExists(conversationId: string): Promise<boolean> {
    const url = this.presign('HEAD', conversationId);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async restoreWorkspace(conversationId: string): Promise<void> {
    if (!this.isEnabled()) return;

    const exists = await this.objectExists(conversationId);
    if (!exists) {
      this.logger.debug(`No workspace snapshot found for conversation ${conversationId}`);
      return;
    }

    const sourceUrl = this.presign('GET', conversationId);
    this.logger.debug(`Restoring workspace for conversation ${conversationId}`);
    const result = await this.connectionManager.restoreState(
      conversationId,
      sourceUrl,
      '/workspace'
    );
    if (!result.success) {
      throw new Error(`RestoreState failed: ${result.error}`);
    }
    this.logger.info(`Workspace restored for conversation ${conversationId}`);
  }

  async backupWorkspace(conversationId: string): Promise<void> {
    if (!this.isEnabled()) return;

    const destinationUrl = this.presign('PUT', conversationId);
    this.logger.debug(`Backing up workspace for conversation ${conversationId}`);
    const result = await this.connectionManager.backupState(
      conversationId,
      destinationUrl,
      '/workspace'
    );
    if (!result.success) {
      throw new Error(`BackupState failed: ${result.error}`);
    }
    this.logger.debug(`Workspace backed up for conversation ${conversationId}`);
  }
}
