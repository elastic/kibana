/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  seriesStatisticsAgentGuidance,
  seriesStatisticsEsqlGuidance,
  seriesStatisticsLensConfigRule,
} from './series_statistics_prompt';

describe('series statistics prompt', () => {
  it('keeps measure-over-time and legend statistics as separate cases', () => {
    expect(seriesStatisticsAgentGuidance).toContain('average <field> over time');
    expect(seriesStatisticsAgentGuidance).toContain('show avg/min/max in the legend');
    expect(seriesStatisticsEsqlGuidance).toContain('omit from the query');
    expect(seriesStatisticsEsqlGuidance).toContain('average <field> over time');
    expect(seriesStatisticsLensConfigRule).toContain('legend.statistics');
    expect(seriesStatisticsLensConfigRule).toContain('average <field> over time');
  });
});
