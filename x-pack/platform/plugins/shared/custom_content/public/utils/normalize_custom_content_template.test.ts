/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind, type EuiThemeComputed } from '@elastic/eui';
import { normalizeCustomContentTemplate } from './normalize_custom_content_template';

const euiTheme = {
  colors: {
    textParagraph: '#343741',
    textHeading: '#1a1c21',
    textSubdued: '#69707d',
    emptyShade: '#ffffff',
    lightestShade: '#f5f7fa',
    primary: '#0077cc',
    accentSecondary: '#008b87',
    accent: '#f04e98',
    warning: '#fec514',
    danger: '#bd271e',
    borderBasePlain: '#d3dae6',
    borderBaseSubdued: '#e0e5ee',
  },
} as unknown as EuiThemeComputed;

describe('normalizeCustomContentTemplate', () => {
  it('preserves Liquid and appends the Kibana alignment layer', () => {
    const template = `{% for row in rows %}<p>{{ row["message"].value }}</p>{% endfor %}`;

    const result = normalizeCustomContentTemplate(template, euiTheme);

    expect(result).toContain(template);
    expect(result).toContain('data-cc-eui-normalizer="true"');
    expect(result).toContain('font-size:var(--cc-font-size-h1)!important');
    expect(result).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('rewrites known theme values, font, spacing, radius, shadows, and gradients', () => {
    const template = `<style>
      .card {
        color: #343741;
        background: linear-gradient(#ffffff, #f5f7fa);
        padding: 10px;
        border-radius: 12px;
        box-shadow: 0 2px 8px #343741;
        font-family: Inter, sans-serif;
      }
    </style><div class="card">Card</div>`;

    const result = normalizeCustomContentTemplate(template, euiTheme);

    expect(result).toContain('color:var(--cc-color-text)');
    expect(result).toContain('background:var(--cc-color-surface)');
    expect(result).toContain('padding:var(--cc-space-s)');
    expect(result).toContain('border-radius:var(--cc-radius)');
    expect(result).toContain('box-shadow:none');
    expect(result).toContain('font-family:var(--cc-font-family)');
  });

  it('maps recognized chart colors in CSS and SVG attributes to visualization tokens', () => {
    const firstVisColor = euiPaletteColorBlind()[0];
    const template = `<style>.chart .series{fill:${firstVisColor}}</style>
      <svg class="chart"><path fill="${firstVisColor}" stroke="#123456"/></svg>`;

    const result = normalizeCustomContentTemplate(template, euiTheme);

    expect(result).toContain('fill:var(--cc-vis-0)');
    expect(result).toContain('fill="var(--cc-vis-0)"');
    expect(result).toContain('stroke="#123456"');
  });

  // A grid stroke painted over `<text class="axis-label">` glyphs washed the labels out.
  it('never strokes chart text, even when its class names look like axis or grid parts', () => {
    const result = normalizeCustomContentTemplate(
      '<svg><text class="axis-label">$0</text></svg>',
      euiTheme
    );

    expect(result).toContain(
      'svg text,svg tspan{font-family:var(--cc-font-family)!important;stroke:none!important}'
    );
    expect(result).not.toContain('svg [class*="axis"],svg [class*="grid"]{stroke:');
    expect(result).toContain('svg :is(line,path,polyline)[class*="grid"]');
  });

  it('applies Lens line, marker, area, grid and axis treatment', () => {
    const result = normalizeCustomContentTemplate('<svg></svg>', euiTheme);

    expect(result).toContain('stroke-width:var(--cc-chart-line-width)!important');
    expect(result).toContain('r:var(--cc-chart-point-radius)!important');
    expect(result).toContain('opacity:var(--cc-chart-area-opacity)!important');
    expect(result).toContain('stroke:var(--cc-chart-grid-color)!important');
    expect(result).toContain('stroke:var(--cc-chart-axis-line-color)!important');
  });

  // Scaling an already-fading gradient by the flat area opacity double-fades it.
  it('leaves gradient-filled areas alone and does not restyle grid or axis lines as series', () => {
    const result = normalizeCustomContentTemplate('<svg></svg>', euiTheme);

    expect(result).toContain('[class*="area"]:not([fill^="url("])');
    expect(result).toContain('[class*="line"]:not([class*="grid"]):not([class*="axis"])');
  });

  it('squares off bars and drops their borders, matching Lens rectangles', () => {
    const result = normalizeCustomContentTemplate('<svg></svg>', euiTheme);

    expect(result).toContain('rx:var(--cc-chart-bar-radius)!important');
    expect(result).toContain('border-radius:var(--cc-chart-bar-radius)!important');
    expect(result).toContain('opacity:var(--cc-chart-bar-opacity)!important');
  });

  // A pill `.bar-track` with overflow:hidden clips a squared `.bar-fill` back into a pill.
  it('squares the bar track so it cannot clip the fill back into a pill', () => {
    const result = normalizeCustomContentTemplate('<svg></svg>', euiTheme);

    expect(result).toContain(
      '[class*="bar-track"],[class*="bar-container"],[class*="bar-wrapper"]{border-radius:var(--cc-chart-bar-radius)!important}'
    );
  });

  // `[class*="bar"]` would also catch navbar, sidebar and toolbar.
  it('matches bars by exact class token rather than substring', () => {
    const result = normalizeCustomContentTemplate('<div class="navbar"></div>', euiTheme);

    expect(result).toContain('[class~="bar"]');
    expect(result).not.toContain(',[class*="bar"]{');
  });

  // Snapping a 50% radius to a pixel token squared off circular badges.
  it('preserves percentage border radii so circular badges stay round', () => {
    const result = normalizeCustomContentTemplate(
      '<style>.rank{border-radius:50%;padding:6px}.card{border-radius:12px}</style>',
      euiTheme
    );

    expect(result).toContain('border-radius:50%');
    expect(result).toContain('border-radius:var(--cc-radius)');
  });

  // Forcing `fill` on a series flooded line paths that rely on `fill="none"`.
  it('leaves series geometry fills to the template', () => {
    const result = normalizeCustomContentTemplate(
      '<svg><path class="series-0" fill="none" stroke="#00BFB3"/></svg>',
      euiTheme
    );

    expect(result).toContain('fill="none"');
    expect(result).not.toContain('[class*="series-0"]{color:');
  });

  it('does not override chart animation timing or opacity', () => {
    const template = `<style>
      .chart { opacity: 0; animation: reveal 900ms ease-out forwards; }
      @keyframes reveal { to { opacity: 1; } }
    </style><svg class="chart"></svg>`;

    const result = normalizeCustomContentTemplate(template, euiTheme);

    expect(result).toContain('animation:reveal 900ms ease-out forwards');
    expect(result).not.toContain('animation-duration:var(--cc-motion-normal)!important');
    expect(result).not.toContain('animation-iteration-count:1!important');
    expect(result).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('rewrites inline styles while preserving unknown values', () => {
    const result = normalizeCustomContentTemplate(
      '<div style="color: #343741; border-color: #123456; gap: 18px">Text</div>',
      euiTheme
    );

    expect(result).toContain(
      'style="color:var(--cc-color-text); border-color:#123456; gap:var(--cc-space-l)"'
    );
  });

  it('is idempotent', () => {
    const once = normalizeCustomContentTemplate('<h1>Title</h1>', euiTheme);
    const twice = normalizeCustomContentTemplate(once, euiTheme);

    expect(twice).toBe(once);
    expect(twice.match(/data-cc-eui-normalizer/g)).toHaveLength(1);
  });
});
