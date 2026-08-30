/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardManagementSkill as skill } from '../dashboard_management_skill';
import {
  getDashboardAuthoringPromptContent,
  getDashboardReviewPromptContent,
} from './dashboard_guidance';

describe('getDashboardAuthoringPromptContent', () => {
  it('gives the dashboard agent HOW rules for composition, grid, controls, and sections', () => {
    const prompt = getDashboardAuthoringPromptContent();

    expect(prompt).toContain('### composition');
    expect(prompt).toContain('Lead with high-level metrics');
    expect(prompt).toContain('### grid');
    expect(prompt).toContain('do not make a single-value metric or gauge full-width');
    expect(prompt).toContain('Metric breakdown');
    expect(prompt).toContain('give it more space');
    expect(prompt).toContain('Heatmap, tagcloud, and region_map → w: 24');
    expect(prompt).toContain('Never narrower than 24');
    expect(prompt).toContain('Pie → w: 12 or 24, h: 10');
    expect(prompt).toContain('### controls');
    expect(prompt).toContain('3–5 `options_list_control` dropdowns');
    expect(prompt).toContain('Copy `field_name` exactly from a panel BY / WHERE clause');
    expect(prompt).toContain('Required fields: type; field_name and index');
    expect(prompt).toContain('Defaults applied by the server');
    expect(prompt).toContain('### sections');
    expect(prompt).toContain('roughly 6 or more visualization panels');
  });

  it('keeps screenshot-only misses out of the authoring prompt', () => {
    const prompt = getDashboardAuthoringPromptContent();

    expect(prompt).not.toContain('is a miss');
    expect(prompt).not.toContain('Considerations:');
  });
});

describe('getDashboardReviewPromptContent', () => {
  it('compiles authoring rules, hard misses, and considerations', () => {
    const prompt = getDashboardReviewPromptContent();

    expect(prompt).toContain('DASHBOARD REVIEW RULES:');
    expect(prompt).toContain('### grid');
    expect(prompt).toContain('do not make a single-value metric or gauge full-width');
    expect(prompt).toContain('full-width single-value metric or gauge is a miss');
    expect(prompt).toContain('metric with a categorical breakdown is not this miss');
    expect(prompt).toContain('leaves unused columns (sum(w) < 48) is a miss');
    expect(prompt).toContain('four metrics at w: 6 occupying only x: 0–24');
    expect(prompt).toContain('A pie panel wider than w: 24 is a miss.');
    expect(prompt).toContain('heatmap, tagcloud, or region_map narrower than w: 24 is a miss');
    expect(prompt).toContain('### controls');
    expect(prompt).toContain('high-cardinality identifier');
    expect(prompt).toContain('Do not flag missing field_name, index, or esql_query');
    expect(prompt).not.toContain('Required fields: type; field_name and index');
    expect(prompt).not.toContain('Defaults applied by the server');
    expect(prompt).toContain('Considerations:');
    expect(prompt).toContain('markdown panel when it adds value');
  });
});

describe('dashboard skill body', () => {
  it('inlines authoring rules and chart-type selection, not review misses', () => {
    expect(skill.content).toContain('Lead with high-level metrics');
    expect(skill.content).toContain('do not make a single-value metric or gauge full-width');
    expect(skill.content).toContain('Metric breakdown');
    expect(skill.content).toContain('3–5 `options_list_control` dropdowns');
    expect(skill.content).toContain('Available chart types');
    expect(skill.content).toContain(
      'at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend"'
    );
    expect(skill.content).not.toContain('is a miss');
    expect(skill.content).not.toContain('DASHBOARD REVIEW RULES:');
  });
});
