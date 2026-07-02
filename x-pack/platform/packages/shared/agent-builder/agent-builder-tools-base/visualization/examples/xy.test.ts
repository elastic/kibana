/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from '../chart_type_registry';
import { xyConfigExamples } from './xy';

describe('XY example configs', () => {
  it('provides at least two canonical examples', () => {
    expect(xyConfigExamples.length).toBeGreaterThanOrEqual(2);
  });

  // Anti-rot: every example must stay valid against the upstream XY schema.
  it.each(xyConfigExamples.map(({ description, config }) => [description, config] as const))(
    'validates against the XY schema: %s',
    (_description, config) => {
      expect(() => chartTypeRegistry[SupportedChartType.XY].schema.validate(config)).not.toThrow();
    }
  );
});
