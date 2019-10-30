/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Sticky } from 'react-sticky';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

const offsetChrome = 49;
const gutterTimeline = '70px'; // Temporary until timeline is moved - MichaelMarcialis

const disableSticky = 'screen and (max-width: ' + euiLightVars.euiBreakpoints.s + ')';
const disableStickyMq = window.matchMedia(disableSticky);

const Aside = styled.aside<{ isSticky?: boolean }>`
  position: relative;
  z-index: ${({ theme }) => theme.eui.euiZNavigation};
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  box-sizing: content-box;
  margin: 0 -${gutterTimeline} 0 -${({ theme }) => theme.eui.euiSizeL};
  padding: ${({ theme }) => theme.eui.euiSize} ${gutterTimeline} ${({ theme }) =>
  theme.eui.euiSize} ${({ theme }) => theme.eui.euiSizeL};

  ${({ isSticky }) =>
    isSticky &&
    css`
      top: ${offsetChrome}px !important;
    `}

  @media only ${disableSticky} {
    position: static !important;
    z-index: ${({ theme }) => theme.eui.euiZContent} !important;
  }
`;

Aside.displayName = 'Aside';

export interface FiltersGlobalProps {
  children: React.ReactNode;
}

export const FiltersGlobal = pure<FiltersGlobalProps>(({ children }) => (
  <Sticky disableCompensation={disableStickyMq.matches} topOffset={-offsetChrome}>
    {({ style, isSticky }) => (
      <Aside isSticky={isSticky} style={style}>
        {children}
      </Aside>
    )}
  </Sticky>
));

FiltersGlobal.displayName = 'FiltersGlobal';
