/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PulseDotsLoader } from './pulse_dots_loader';

describe('PulseDotsLoader', () => {
  it('draws the center first and the surrounding dots 192ms later', () => {
    const { container } = render(<PulseDotsLoader size={24} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('data-variant', 'pulse-dots');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');

    const circles = Array.from(container.querySelectorAll('circle')).map((circle) => ({
      cx: circle.getAttribute('cx'),
      cy: circle.getAttribute('cy'),
      r: circle.getAttribute('r'),
      delay: circle.style.animationDelay,
    }));

    expect(circles).toEqual([
      { cx: '8.571', cy: '1.714', r: '1.714', delay: '192ms' },
      { cx: '15.428', cy: '1.714', r: '1.714', delay: '192ms' },
      { cx: '1.714', cy: '8.571', r: '1.714', delay: '192ms' },
      { cx: '8.571', cy: '8.571', r: '1.714', delay: '0ms' },
      { cx: '15.428', cy: '8.571', r: '1.714', delay: '0ms' },
      { cx: '22.285', cy: '8.571', r: '1.714', delay: '192ms' },
      { cx: '1.714', cy: '15.428', r: '1.714', delay: '192ms' },
      { cx: '8.571', cy: '15.428', r: '1.714', delay: '0ms' },
      { cx: '15.428', cy: '15.428', r: '1.714', delay: '0ms' },
      { cx: '22.285', cy: '15.428', r: '1.714', delay: '192ms' },
      { cx: '8.571', cy: '22.285', r: '1.714', delay: '192ms' },
      { cx: '15.428', cy: '22.285', r: '1.714', delay: '192ms' },
    ]);
  });
});
