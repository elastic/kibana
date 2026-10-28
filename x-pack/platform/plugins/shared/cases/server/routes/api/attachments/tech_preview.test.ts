/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { deleteAllAttachmentsRoute } from './delete_all_attachments';
import { deleteAttachmentRoute } from './delete_attachment';
import { findAttachmentsRoute } from './find_attachments';
import { getAttachmentRoute } from './get_attachment';
import { postAttachmentRoute } from './post_attachment';
import { putAttachmentRoute } from './put_attachment';

interface OpenApiSpec {
  paths: Record<string, Record<string, { 'x-state'?: string }>>;
}

const routes = [
  postAttachmentRoute,
  findAttachmentsRoute,
  deleteAllAttachmentsRoute,
  getAttachmentRoute,
  putAttachmentRoute,
  deleteAttachmentRoute,
].map((route) => [`${route.method.toUpperCase()} ${route.path}`, route] as const);

const toDocsPath = (routePath: string): string =>
  routePath.replace('{case_id}', '{caseId}').replace('{id}', '{attachmentId}');

describe('attachments routes technical preview', () => {
  it.each(routes)('%s is a public technical preview route', (_, route) => {
    expect(route.routerOptions).toEqual(
      expect.objectContaining({
        access: 'public',
        availability: { stability: 'tech_preview', since: '9.6.0' },
      })
    );
  });

  describe('OpenAPI spec', () => {
    const spec: OpenApiSpec = JSON.parse(
      readFileSync(resolve(__dirname, '../../../../docs/openapi/bundled-types.json'), 'utf8')
    );

    it.each(routes)('%s is marked technical preview', (_, route) => {
      expect(spec.paths[toDocsPath(route.path)]?.[route.method]?.['x-state']).toBe(
        'Technical preview; added in 9.6.0'
      );
    });
  });
});
