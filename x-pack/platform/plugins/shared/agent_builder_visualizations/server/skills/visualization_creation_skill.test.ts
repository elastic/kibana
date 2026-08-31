/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visualizationCreationSkill } from './visualization_creation_skill';

describe('visualizationCreationSkill', () => {
  it('routes time-series avg/min/max to Lens XY legend statistics', () => {
    expect(visualizationCreationSkill.content).toContain('average <field> over time');
    expect(visualizationCreationSkill.content).toContain('show avg/min/max in the legend');
    expect(visualizationCreationSkill.content).toContain('do not pick Vega');

    const examples = visualizationCreationSkill.referencedContent?.find(
      (item) => item.name === 'create-visualization-requests'
    );
    expect(examples?.content).toContain('Log volume over time, show avg/min/max in the legend');
  });
});
