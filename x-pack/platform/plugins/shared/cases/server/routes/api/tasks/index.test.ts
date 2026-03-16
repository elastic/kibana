/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema } from '../../../config';
import { getTaskTemplateRoutes } from '../task_templates';
import { getTaskRoutes } from '.';

describe('task routes', () => {
  it('are registered as internal routes only when the feature is enabled', () => {
    const enabled = ConfigSchema.validate({ tasks: { enabled: true } });
    const disabled = ConfigSchema.validate({ tasks: { enabled: false } });

    const routes = [...getTaskRoutes(enabled), ...getTaskTemplateRoutes(enabled)];
    expect(routes).toHaveLength(13);
    expect(routes.every((route) => route.routerOptions?.access === 'internal')).toBe(true);

    expect(getTaskRoutes(disabled)).toEqual([]);
    expect(getTaskTemplateRoutes(disabled)).toEqual([]);
  });
});
