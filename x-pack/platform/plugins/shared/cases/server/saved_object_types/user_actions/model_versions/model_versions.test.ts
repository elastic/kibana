/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_WORKFLOW_ORIGIN_TYPE_LENGTH,
} from '../../../../common/constants';
import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';
import { modelVersion3 } from './model_version_3';

describe('cases-user-actions model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });
  });

  describe('version 2', () => {
    it('adds the source mapping', () => {
      expect(modelVersion2.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            source: {
              properties: {
                type: { type: 'keyword', ignore_above: 1024 },
              },
            },
          },
        },
      ]);
    });

    it('accepts an unknown source.type in forwardCompatibility', () => {
      const schema = modelVersion2.schemas?.forwardCompatibility;
      if (typeof schema === 'function') {
        throw new Error('expected an object schema, got a function');
      }

      const attrs = {
        action: 'create',
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: { username: 'elastic' },
        owner: 'cases',
        type: 'comment',
        source: { type: 'some_future_source', id: '1' },
      };

      expect(() => schema?.validate(attrs)).not.toThrow();
    });

    it('rejects an unknown source.type in create', () => {
      const schema = modelVersion2.schemas?.create;
      if (!schema) {
        throw new Error('expected a create schema');
      }

      const attrs = {
        action: 'create',
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: { username: 'elastic' },
        owner: 'cases',
        type: 'comment',
        source: { type: 'some_future_source', id: '1' },
      };

      expect(() => schema.validate(attrs)).toThrow();
    });
  });

  describe('version 3', () => {
    it('adds the payload.origin.type and payload.origin.attachmentType mappings', () => {
      expect(modelVersion3.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            payload: {
              properties: {
                origin: {
                  properties: {
                    type: { type: 'keyword', ignore_above: 1024 },
                    attachmentType: { type: 'keyword', ignore_above: 1024 },
                  },
                },
              },
            },
          },
        },
      ]);
    });

    const workflowUserAction = (origin: Record<string, unknown>) => ({
      action: 'add',
      created_at: '2020-01-01T00:00:00.000Z',
      created_by: { username: 'elastic' },
      owner: 'cases',
      type: 'workflow',
      payload: {
        workflow: { id: 'workflow-1', name: 'Workflow', executionId: 'execution-1' },
        origin,
      },
    });

    it('accepts an attachment origin in create', () => {
      const schema = modelVersion3.schemas?.create;
      if (!schema) {
        throw new Error('expected a create schema');
      }

      expect(() =>
        schema.validate(
          workflowUserAction({ type: 'cases.attachment', id: '1', attachmentType: 'alert' })
        )
      ).not.toThrow();
    });

    it('rejects an attachmentType longer than the attachment type limit in create', () => {
      const schema = modelVersion3.schemas?.create;
      if (!schema) {
        throw new Error('expected a create schema');
      }

      expect(() =>
        schema.validate(
          workflowUserAction({
            type: 'cases.attachment',
            id: '1',
            attachmentType: 'a'.repeat(MAX_ATTACHMENT_TYPE_LENGTH + 1),
          })
        )
      ).toThrow();
    });

    it('accepts an unknown origin.type in forwardCompatibility', () => {
      const schema = modelVersion3.schemas?.forwardCompatibility;
      if (typeof schema === 'function') {
        throw new Error('expected an object schema, got a function');
      }

      expect(() =>
        schema?.validate(workflowUserAction({ type: 'cases.some_future_origin', id: '1' }))
      ).not.toThrow();
    });

    it('rejects an origin.type longer than the origin type limit in forwardCompatibility', () => {
      const schema = modelVersion3.schemas?.forwardCompatibility;
      if (typeof schema === 'function') {
        throw new Error('expected an object schema, got a function');
      }

      expect(() =>
        schema?.validate(
          workflowUserAction({ type: 'a'.repeat(MAX_WORKFLOW_ORIGIN_TYPE_LENGTH + 1), id: '1' })
        )
      ).toThrow();
    });

    it('still rejects an unknown source.type in create', () => {
      const schema = modelVersion3.schemas?.create;
      if (!schema) {
        throw new Error('expected a create schema');
      }

      expect(() =>
        schema.validate({
          ...workflowUserAction({ type: 'cases.case', id: '1' }),
          source: { type: 'some_future_source', id: '1' },
        })
      ).toThrow();
    });
  });
});
