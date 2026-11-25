/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepPreviewData } from './get_step_preview_data';
import { getFieldsFromZodSchema } from './get_step_preview_fields';
import { stepSchemas } from '../../../../common/step_schemas';

describe('getStepPreviewData', () => {
  it('returns schemas for built-in steps', () => {
    const previewData = getStepPreviewData('wait');

    expect(getFieldsFromZodSchema(previewData.inputSchema)).not.toHaveLength(0);
    expect(previewData.outputSchema).toBeDefined();
  });

  it('wraps raw connector snippets in a yaml fence so they render as markdown', () => {
    const snippet = '- name: run_query\n  type: test.connector';
    jest
      .spyOn(stepSchemas, 'getAllConnectorsMapCache')
      .mockReturnValue(
        new Map([['test.connector', { examples: { snippet } }]]) as unknown as ReturnType<
          typeof stepSchemas.getAllConnectorsMapCache
        >
      );

    expect(getStepPreviewData('test.connector').examples).toEqual([
      `\`\`\`yaml\n${snippet}\n\`\`\``,
    ]);
  });
});
