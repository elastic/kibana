/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { borealisDark, borealisLight } from '@kbn/isomer-theme';
import { createIsomerRuntime } from '@elastic/isomer-runtime';

import {
  vegaBorealisAdaptiveTheme,
  vegaBorealisDarkTheme,
  vegaBorealisLightTheme,
} from './borealis_theme';
import { vegaExample } from './examples';
import { vegaPack } from './pack';
import { renderVegaSvg, toVegaSpec } from './render';

const draw = (theme = vegaBorealisLightTheme) =>
  renderVegaSvg(toVegaSpec(vegaExample, theme), vegaExample).svg;

describe('Borealis themes', () => {
  it.each([
    ['light', vegaBorealisLightTheme, borealisLight],
    ['dark', vegaBorealisDarkTheme, borealisDark],
  ])('draws %s with its text, background, and first series colour', (_mode, theme, tokens) => {
    const svg = draw(theme);
    expect(svg).toContain(`fill="${tokens.color.text.paragraph}"`);
    expect(svg).toContain(tokens.color.background.plain);
    expect(svg).toContain(tokens.color.vis.series0);
  });

  it('is the pack default on react and html, in `currentColor`', () => {
    const runtime = createIsomerRuntime({ packs: [vegaPack] });
    const { html } = runtime.surfaces.html.render({ type: 'view', body: [vegaExample] });
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain(vegaBorealisAdaptiveTheme.palette[0]);
    expect(html).toContain(borealisLight.font.family.sans.split(',')[0]);
  });
});
