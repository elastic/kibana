/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pipeline } from '../../common';
import { createSync } from '../util';
import { createPipeline } from './pipeline';

jest.mock('../util');

describe('createPipeline', () => {
  const dataStreamPath = 'path';

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Should call createSync with formatted pipeline', async () => {
    const dataStreamPipeline: Pipeline = {
      processors: [
        {
          set: {
            field: 'ecs.version',
            value: '8.11.0',
          },
        },
        {
          rename: {
            field: 'message',
            target_field: 'event.original',
            ignore_missing: true,
            if: 'ctx.event?.original == null',
          },
        },
      ],
    };
    createPipeline(dataStreamPath, dataStreamPipeline);

    const expectYamlContent = `---
processors:
  - set:
      field: ecs.version
      value: 8.11.0
  - rename:
      field: message
      target_field: event.original
      ignore_missing: true
      if: ctx.event?.original == null
`;
    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/elasticsearch/ingest_pipeline/default.yml`,
      expectYamlContent
    );
  });

  it('Should call createSync even if pipeline is empty', async () => {
    createPipeline(dataStreamPath, {});

    const expectYamlContent = `---
{}
`;
    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/elasticsearch/ingest_pipeline/default.yml`,
      expectYamlContent
    );
  });
});
