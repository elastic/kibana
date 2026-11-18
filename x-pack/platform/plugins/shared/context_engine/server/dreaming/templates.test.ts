/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDreamingTemplateConfig } from '../../common/dreaming_templates';
import {
  dreamingConfigSchema,
  dreamingTemplatesResponseSchema,
} from '../routes/schemas/dreaming_schema';
import { getDreamingTemplates } from './templates';

describe('getDreamingTemplates', () => {
  it('loads the built-in templates in order, each passing the response and dreaming config schemas', async () => {
    const templates = await getDreamingTemplates();

    expect(templates.length).toBeGreaterThan(0);
    expect(new Set(templates.map(({ id }) => id)).size).toBe(templates.length);
    expect(dreamingTemplatesResponseSchema().validate({ templates })).toEqual({ templates });

    for (const template of templates) {
      const config = {
        enabled: true,
        ...buildDreamingTemplateConfig(template, template.summary),
      };
      expect(dreamingConfigSchema.validate(config)).toEqual(config);
    }
  });
});
