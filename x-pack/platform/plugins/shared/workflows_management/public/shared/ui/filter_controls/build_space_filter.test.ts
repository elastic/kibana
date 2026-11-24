/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSpaceFilter } from './build_space_filter';
import { buildWorkflowExecutionsSpaceFilter } from '../../../../server/api/lib/build_workflow_executions_search_query';

describe('buildSpaceFilter', () => {
  it('matches the executions list space query', () => {
    const filter = buildSpaceFilter('my-space');

    expect(filter.query).toEqual(buildWorkflowExecutionsSpaceFilter('my-space'));
    expect(filter.meta.disabled).toBe(false);
    expect(filter.meta.negate).toBe(false);
  });
});
