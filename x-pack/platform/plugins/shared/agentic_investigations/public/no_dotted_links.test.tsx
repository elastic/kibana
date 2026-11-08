/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NoDottedLinks } from './no_dotted_links';

describe('NoDottedLinks', () => {
  it('turns off the resting underline of links, and leaves hover and focus alone', () => {
    render(<NoDottedLinks />);

    // Emotion may insert its rules through the style sheet, which leaves the tag's text empty.
    const rules = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n');
    expect(rules).toContain('euiLink:not(:hover):not(:focus)');
    expect(rules).toContain('text-decoration:none');
  });
});
