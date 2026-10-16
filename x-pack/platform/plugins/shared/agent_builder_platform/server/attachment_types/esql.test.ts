/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsqlAttachmentData,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { createEsqlAttachmentType } from './esql';

const toSurfaceComposition = (data: EsqlAttachmentData) =>
  createEsqlAttachmentType().toSurfaceComposition?.(data, {
    attachment: {} as VersionedAttachment,
    version: 1,
  });

describe('esql attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('shows the query in an ES|QL code block', () => {
      expect(toSurfaceComposition({ query: 'FROM logs | LIMIT 10' })).toEqual({
        type: 'view',
        body: [{ type: 'markdown', text: '```esql\nFROM logs | LIMIT 10\n```' }],
      });
    });

    it('shows the description before the query', () => {
      expect(toSurfaceComposition({ query: 'FROM logs', description: 'All logs' })?.body).toEqual([
        { type: 'markdown', text: 'All logs\n\n```esql\nFROM logs\n```' },
      ]);
    });
  });
});
