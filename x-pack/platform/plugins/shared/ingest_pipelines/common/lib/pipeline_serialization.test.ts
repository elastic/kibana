/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializePipelines } from './pipeline_serialization';

describe('pipeline_serialization', () => {
  describe('deserializePipelines()', () => {
    it('should deserialize pipelines', () => {
      expect(
        deserializePipelines({
          pipeline1: {
            description: 'pipeline 1 description',
            version: 1,
            processors: [
              {
                script: {
                  source: 'ctx._type = null',
                },
              },
            ],
            on_failure: [
              {
                set: {
                  field: 'error.message',
                  value: '{{ failure_message }}',
                },
              },
            ],
          },
          pipeline2: {
            description: 'pipeline2 description',
            version: 1,
            processors: [],
          },
          pipeline3: {
            description: 'pipeline3 description',
            version: 1,
            processors: [],
            _meta: {
              managed: true,
            },
          },
        })
      ).toEqual([
        {
          name: 'pipeline1',
          description: 'pipeline 1 description',
          version: 1,
          processors: [
            {
              script: {
                source: 'ctx._type = null',
              },
            },
          ],
          on_failure: [
            {
              set: {
                field: 'error.message',
                value: '{{ failure_message }}',
              },
            },
          ],
          isManaged: false,
        },
        {
          name: 'pipeline2',
          description: 'pipeline2 description',
          version: 1,
          processors: [],
          isManaged: false,
        },
        {
          name: 'pipeline3',
          description: 'pipeline3 description',
          version: 1,
          processors: [],
          isManaged: true,
          _meta: {
            managed: true,
          },
        },
      ]);
    });
  });
});
