/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DREAMING_TYPE_PATTERN } from '../../common/dreaming';
import { buildDreamingTemplateConfig } from '../../common/dreaming_templates';
import { dreamingConfigSchema } from '../routes/schemas/dreaming_schema';
import { DREAMING_TEMPLATES, DREAMING_TEMPLATES_BY_ID } from './dreaming_templates';

describe('DREAMING_TEMPLATES', () => {
  it('lists every built-in template once in display order, each valid as a dreaming config', () => {
    const ids = DREAMING_TEMPLATES.map(({ id }) => id);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(Object.keys(DREAMING_TEMPLATES_BY_ID)));

    for (const template of DREAMING_TEMPLATES) {
      expect(template.id).toMatch(DREAMING_TYPE_PATTERN);
      expect(template.name.trim().length).toBeGreaterThan(0);
      expect(template.description.trim().length).toBeGreaterThan(0);
      expect(template.summary.trim().length).toBeGreaterThan(0);
      expect(template.rationale.trim().length).toBeGreaterThan(0);

      const config = {
        enabled: true,
        ...buildDreamingTemplateConfig(template, template.summary),
      };
      expect(dreamingConfigSchema.validate(config)).toEqual(config);
    }
  });
});
