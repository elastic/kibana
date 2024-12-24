/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import { createFileHashTransform } from '@kbn/files-plugin/server';

import { v4 as uuidV4 } from 'uuid';

import { FleetFilesClientError } from '../../errors';

import type { FleetFile, FleetToHostFileClientInterface } from './types';

import { FleetFromHostFilesClient } from './client_from_host';
import type { FileCustomMeta } from './types';
import type { FleetFileUpdatableFields, HapiReadableStream } from './types';

export class FleetToHostFilesClient
  extends FleetFromHostFilesClient
  implements FleetToHostFileClientInterface
{
  async get(fileId: string): Promise<FleetFile> {
    const esFile = await this.esFileClient.get<FileCustomMeta>({ id: fileId });
    const file = this.mapIndexedDocToFleetFile(esFile);
    await this.adjustFileStatusIfNeeded(file);

    return file;
  }

  async create(fileStream: HapiReadableStream, agentIds: string[]): Promise<FleetFile> {
    assert(agentIds.length > 0, new FleetFilesClientError('Missing agentIds!'));

    const uploadedFile = await this.esFileClient.create<FileCustomMeta>({
      id: uuidV4(),
      metadata: {
        name: fileStream.hapi.filename ?? 'unknown_file_name',
        mime: fileStream.hapi.headers['content-type'] ?? 'application/octet-stream',
        meta: {
          target_agents: agentIds,
          action_id: '',
        },
      },
    });

    await uploadedFile.uploadContent(fileStream, undefined, {
      transforms: [createFileHashTransform()],
    });

    assert(
      uploadedFile.data.hash && uploadedFile.data.hash.sha256,
      new FleetFilesClientError('File hash was not generated!')
    );

    return this.mapIndexedDocToFleetFile(uploadedFile);
  }

  async update(
    fileId: string,
    updates: Partial<FleetFileUpdatableFields> = {}
  ): Promise<FleetFile> {
    const file = await this.esFileClient.get<FileCustomMeta>({
      id: fileId,
    });

    const { agents, actionId } = updates;
    const meta: FileCustomMeta = {
      target_agents: agents ?? file.data.meta?.target_agents ?? [],
      action_id: actionId ?? file.data.meta?.action_id ?? '',
    };

    await file.update({ meta });

    return this.mapIndexedDocToFleetFile(file);
  }

  async delete(fileId: string): Promise<void> {
    await this.esFileClient.delete({ id: fileId, hasContent: true });
  }
}
