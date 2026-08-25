/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { clearSyntaxGrammars, registerDefaultSyntaxGrammars } from '@kbn/adaptive-ui/syntax';
import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import {
  sampleSecurityRuleAttachment,
  toSecurityRuleViewSpec,
} from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';
import { AdaptiveViewContainer } from './view_renderer';

describe('security.rule attachment adapter (record/detail)', () => {
  beforeAll(() => registerDefaultSyntaxGrammars());
  afterAll(() => clearSyntaxGrammars());

  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toSecurityRuleViewSpec(sampleSecurityRuleAttachment);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('Severity');
    expect(rendered).toContain('Risk score');
    expect(rendered).toContain('73');
    expect(rendered).toContain('Custom query');
    expect(rendered).toContain('winlogbeat-*');
    expect(rendered).toContain('Execution');
    expect(rendered).toContain('powershell.exe');
    expect(rendered).toContain('-EncodedCommand');
  });

  it('highlights the KQL query when mounted as AdaptiveView in the light DOM', () => {
    const core = coreMock.createStart();
    const spec = toSecurityRuleViewSpec(sampleSecurityRuleAttachment);
    const { container } = render(
      <AdaptiveViewContainer spec={spec} {...{ core }} styleIsolation="document" />
    );

    expect(container.textContent).toContain('process.name : "powershell.exe"');
    const codeSpans = container.querySelectorAll('[data-copy-source] span');
    expect(codeSpans.length).toBeGreaterThan(0);
  });
});
