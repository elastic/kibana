/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { buildSuggestTechPreviewBadgeRules } from './get_suggest_tech_preview_badge_styles';

jest.mock('@kbn/workflows-ui', () => ({
  HardcodedIcons: {
    flask: `data:image/svg+xml;base64,${btoa(
      '<svg viewBox="0 0 16 16"><path d="M5 2h1z"/></svg>'
    )}`,
  },
}));

const createMockEuiThemeContext = (): UseEuiTheme => ({
  euiTheme: {
    colors: {
      textPrimary: '#343741',
      textParagraph: '#1d2a3e',
      backgroundBasePlain: '#ffffff',
      backgroundBaseInteractiveSelect: '#e6f0f8',
      vis: {
        euiColorVis2: '#017d73',
      },
    },
    components: {
      badgeBorderColorHollow: '#d3dae6',
    },
  } as UseEuiTheme['euiTheme'],
  colorMode: 'LIGHT',
  modifications: {},
  highContrastMode: false,
});

describe('buildSuggestTechPreviewBadgeRules', () => {
  it('generates aria-label scoped rules with flask mask styling', () => {
    const css = buildSuggestTechPreviewBadgeRules(
      ['cases.caseCreated'],
      createMockEuiThemeContext()
    );

    expect(css).toContain('[aria-label^="cases.caseCreated"]');
    expect(css).toContain('.main > .left::after');
    expect(css).not.toContain('.monaco-icon-label');
    expect(css).toContain('#d3dae6');
  });

  it('paints the flask with the theme text color', () => {
    const css = buildSuggestTechPreviewBadgeRules(
      ['cases.caseCreated'],
      createMockEuiThemeContext()
    );
    const [, flaskBase64] = css.match(/url\('data:image\/svg\+xml;base64,([^']+)'\)/) ?? [];

    expect(atob(flaskBase64)).toContain('<svg fill="#1d2a3e"');
  });

  it('escapes double quotes in aria-label prefixes', () => {
    const css = buildSuggestTechPreviewBadgeRules(['say"hello'], createMockEuiThemeContext());

    expect(css).toContain('[aria-label^="say\\"hello"]');
  });
});
