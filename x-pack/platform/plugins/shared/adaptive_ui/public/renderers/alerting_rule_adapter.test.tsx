/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleAlertingRule, toAlertingRuleViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('platform.alerting.rule attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toAlertingRuleViewSpec(sampleAlertingRule);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('High error rate on checkout');
    expect(rendered).toContain('Enabled');
    expect(rendered).toContain('Every 1m');
    expect(rendered).toContain(
      'FROM metrics-checkout-* | STATS error_rate = AVG(http.5xx_ratio) BY service.name'
    );
  });

  it('renders the composed breach query the executor runs', () => {
    const spec = toAlertingRuleViewSpec({
      ...sampleAlertingRule,
      query: {
        format: 'composed',
        base: 'FROM metrics-*',
        breach: { segment: 'WHERE cpu > 0.9' },
      },
    });
    const queryNode = spec.body.find((node) => node.type === 'codeBlock');
    expect(queryNode).toEqual(
      expect.objectContaining({
        type: 'codeBlock',
        code: 'FROM metrics-* | WHERE cpu > 0.9',
      })
    );
  });
});
