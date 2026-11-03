/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { FilesStart } from '@kbn/files-plugin/server';
import { builtinBrowserToolDescriptors } from '@kbn/agent-builder-common';
import type { BrowserToolsRunContext } from '@kbn/agent-builder-server/runner';
import { createBrowserToolDescriptorRegistry } from './registry';
import type { BrowserToolDescriptorRegistry } from './registry';
import { createBrowserToolCallClient } from './persistence';
import type { BrowserToolCallClient } from './persistence';
import { createUploadBrowserToolImage } from './executable/upload_image';

export interface BrowserToolsService extends BrowserToolsRunContext {
  registry: BrowserToolDescriptorRegistry;
  callClient: BrowserToolCallClient;
}

export const createBrowserToolsService = ({
  logger,
  elasticsearch,
  files,
}: {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  files: FilesStart;
}): BrowserToolsService => {
  return {
    registry: createBrowserToolDescriptorRegistry({ seed: builtinBrowserToolDescriptors }),
    callClient: createBrowserToolCallClient({
      logger,
      esClient: elasticsearch.client.asInternalUser,
    }),
    uploadImage: createUploadBrowserToolImage({ files }),
  };
};
