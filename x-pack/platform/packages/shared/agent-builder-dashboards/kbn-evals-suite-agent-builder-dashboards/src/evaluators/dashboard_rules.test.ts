/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { control, dashboard, metric, section, xy } from '../test_helpers';
import {
  COMPOSITION_RULES,
  SCORED_RULES,
  findViolations,
  getRuleStrictness,
  type DashboardRuleId,
} from './dashboard_rules';

const rulesHit = (violations: ReturnType<typeof findViolations>): DashboardRuleId[] =>
  [...new Set(violations.map(({ rule }) => rule))].sort();

describe('dashboard rules', () => {
  describe('layout', () => {
    it('flags panels outside the 48-column grid, overlaps, and full-width KPIs', () => {
      const violations = findViolations(
        dashboard([
          metric('wide', { x: 0, y: 0, w: 48, h: 5 }),
          xy('a', { x: 0, y: 5, w: 24, h: 10 }),
          xy('b', { x: 12, y: 5, w: 24, h: 10 }),
          xy('c', { x: 36, y: 15, w: 24, h: 10 }),
        ]),
        ['out_of_bounds', 'overlapping_panels', 'full_width_kpi']
      );
      expect(rulesHit(violations)).toEqual([
        'full_width_kpi',
        'out_of_bounds',
        'overlapping_panels',
      ]);
      expect(violations.find(({ rule }) => rule === 'overlapping_panels')?.panelIds).toEqual([
        'a',
        'b',
      ]);
      expect(violations.find(({ rule }) => rule === 'out_of_bounds')?.panelIds).toEqual(['c']);
    });

    it('does not count panels in different sections as overlapping', () => {
      const violations = findViolations(
        dashboard([
          section('s1', 'Traffic', 0, [xy('a', { x: 0, y: 0, w: 24, h: 10 })]),
          section('s2', 'Errors', 1, [xy('b', { x: 0, y: 0, w: 24, h: 10 })]),
        ]),
        ['overlapping_panels']
      );
      expect(violations).toEqual([]);
    });
  });

  describe('composition', () => {
    it('flags metrics placed after other charts in the same container', () => {
      const violations = findViolations(
        dashboard([
          xy('chart', { x: 0, y: 0, w: 48, h: 10 }),
          metric('kpi', { x: 0, y: 10, w: 12, h: 5 }),
        ]),
        ['summary_not_first']
      );
      expect(violations).toHaveLength(1);
      expect(violations[0].panelIds).toEqual(['kpi']);
    });

    it('accepts metrics that lead the dashboard', () => {
      expect(
        findViolations(
          dashboard([
            metric('kpi', { x: 0, y: 0, w: 12, h: 5 }),
            xy('chart', { x: 0, y: 5, w: 48, h: 10 }),
          ]),
          ['summary_not_first']
        )
      ).toEqual([]);
    });

    it('flags a panel that runs the same ES|QL as an earlier one for No Regression only', () => {
      const violations = findViolations(
        dashboard([xy('a', { x: 0, y: 0, w: 24, h: 10 }), xy('b', { x: 24, y: 0, w: 24, h: 10 })]),
        ['duplicate_measure']
      );
      expect(violations).toHaveLength(1);
      expect(violations[0].panelIds).toEqual(['b']);
      expect(COMPOSITION_RULES).not.toContain('duplicate_measure');
      expect(SCORED_RULES).toContain('duplicate_measure');
    });

    it('flags the same duplicate copy whatever the panel order', () => {
      const first = xy('requests-by-response', { x: 0, y: 0, w: 24, h: 10 });
      const second = xy('response-breakdown', { x: 24, y: 0, w: 24, h: 10 });
      const flagged = (panels: DashboardAttachmentData['panels']) =>
        findViolations(dashboard(panels), ['duplicate_measure']).flatMap(
          ({ panelIds }) => panelIds
        );

      expect(flagged([first, second])).toEqual(['response-breakdown']);
      expect(flagged([second, first])).toEqual(['response-breakdown']);
      expect(flagged([section('s', 'Responses', 0, [second]), first])).toEqual([
        'response-breakdown',
      ]);
    });

    it('reports missing sections as guidance, not a scored rule', () => {
      expect(getRuleStrictness('no_sections')).toBe('should');
      expect(SCORED_RULES).not.toContain('no_sections');
    });
  });

  describe('controls', () => {
    it('flags more than five filter controls and more than one time slider', () => {
      const controls = ['a', 'b', 'c', 'd', 'e', 'f'].map((field) => control(field));
      const sliders = [control('t1', 'time_slider_control'), control('t2', 'time_slider_control')];
      expect(
        rulesHit(
          findViolations(dashboard([], { pinned_panels: [...controls, ...sliders] }), [
            'too_many_controls',
            'multiple_time_sliders',
          ])
        )
      ).toEqual(['multiple_time_sliders', 'too_many_controls']);
    });

    it('flags id-like control fields, including their .keyword sibling', () => {
      const violations = findViolations(
        dashboard([], {
          pinned_panels: [control('user.id.keyword'), control('trace_id'), control('host')],
        }),
        ['high_cardinality_control']
      );
      expect(violations).toHaveLength(1);
      expect(violations[0].detail).toContain('user.id.keyword, trace_id');
    });

    it('keeps no_controls out of the scored rules because controls are optional', () => {
      expect(getRuleStrictness('no_controls')).toBe('must');
      expect(SCORED_RULES).not.toContain('no_controls');
      expect(findViolations(dashboard([]), ['no_controls'])).toHaveLength(1);
    });
  });

  it('flags placeholder titles only', () => {
    expect(
      findViolations(dashboard([], { title: 'Untitled dashboard' }), ['placeholder_title'])
    ).toHaveLength(1);
    expect(
      findViolations(dashboard([], { title: 'Dashboard 2' }), ['placeholder_title'])
    ).toHaveLength(1);
    expect(
      findViolations(dashboard([], { title: 'Web traffic overview' }), ['placeholder_title'])
    ).toEqual([]);
  });
});
