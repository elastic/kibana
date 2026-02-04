/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/require_kbn_fs */
import * as fs from 'fs/promises';
import * as path from 'path';

import { schema } from '@kbn/config-schema';

import type { ExternalRouteDeps } from '.';
import { createLicensedRouteHandler } from '../../lib';

export function initTestFilesystemWriteApi(deps: ExternalRouteDeps) {
  const { router } = deps;

  router.post(
    {
      path: '/api/spaces/test-filesystem-write',
      security: {
        authz: {
          enabled: false,
          reason: 'This is a test route for filesystem write testing',
        },
      },
      options: {
        access: 'public',
        summary: `Test filesystem write to a non-writable directory`,
        tags: ['oas-tag:spaces'],
      },
      validate: {
        body: schema.object({
          directory: schema.string({
            meta: { description: 'The directory path to attempt writing to' },
            defaultValue: '/usr/share/kibana',
          }),
          filename: schema.string({
            meta: { description: 'The filename to write' },
            defaultValue: 'test-write.txt',
          }),
          content: schema.string({
            meta: { description: 'The content to write to the file' },
            defaultValue: 'test content',
          }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { directory, filename, content } = request.body;
      const filePath = path.join(directory, filename);

      await fs.writeFile(filePath, content, 'utf8');

      const readContent = await fs.readFile(filePath, 'utf8');

      return response.ok({
        body: {
          success: true,
          message: `Successfully wrote to ${filePath}`,
          directory,
          filePath,
          content: readContent,
        },
      });
    })
  );
}
