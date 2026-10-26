/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { ACCENT_COLORS } from '../theme/page_theme';
import { AppFrame } from './app_frame';

/** Says what the theme is where a component of the app would read it. */
const Reader = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <output data-test-subj="theme">
      {JSON.stringify({
        fill: euiTheme.colors.backgroundFilledPrimary,
        text: euiTheme.colors.textPrimary,
        link: euiTheme.colors.link,
        radius: euiTheme.border.radius.medium,
      })}
    </output>
  );
};

const themeOf = () => JSON.parse(screen.getByTestId('theme').textContent ?? '{}');

describe('the frame of an app, with a theme', () => {
  it('leaves a page with no theme as Kibana draws it, and adds nothing around it', () => {
    const { container } = render(
      <AppFrame>
        <Reader />
      </AppFrame>
    );

    expect(themeOf().fill).not.toBe(ACCENT_COLORS.purple.fill);
    expect(container.firstElementChild).toHaveAttribute('data-test-subj', 'customAppFrame');
  });

  it('gives what is inside the colour of the accent', () => {
    render(
      <AppFrame theme={{ accent: 'purple' }}>
        <Reader />
      </AppFrame>
    );

    expect(themeOf().fill).toBe(ACCENT_COLORS.purple.fill);
    expect(themeOf().text).toBe(ACCENT_COLORS.purple.text);
    expect(themeOf().link).toBe(ACCENT_COLORS.purple.text);
  });

  it('gives what is inside the corners of the shape', () => {
    const radiusOf = (shape: 'soft' | 'sharp') => {
      const { unmount } = render(
        <AppFrame theme={{ shape }}>
          <Reader />
        </AppFrame>
      );
      const { radius } = themeOf();
      unmount();
      return radius;
    };

    expect(radiusOf('soft')).toBe('14px');
    expect(radiusOf('sharp')).toBe('2px');
  });

  it('changes nothing outside the frame', () => {
    render(
      <>
        <Reader />
        <AppFrame theme={{ accent: 'orange', shape: 'soft' }}>
          <span />
        </AppFrame>
      </>
    );

    expect(themeOf().fill).not.toBe(ACCENT_COLORS.orange.fill);
    expect(themeOf().radius).not.toBe('14px');
  });

  it('keeps the frame itself the one element around the app, as it is without a theme', () => {
    const { container } = render(
      <AppFrame theme={{ accent: 'teal' }}>
        <span />
      </AppFrame>
    );

    expect(container.firstElementChild).toHaveAttribute('data-test-subj', 'customAppFrame');
    expect(container.children).toHaveLength(1);
  });
});
