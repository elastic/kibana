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

import { gutterTimeline } from '../../lib/helpers';

const offsetChrome = 49;

const disableSticky = 'screen and (max-width: ' + euiLightVars.euiBreakpoints.s + ')';
const disableStickyMq = window.matchMedia(disableSticky);

const Wrapper = styled.aside<{ isSticky?: boolean }>`
  ${props => css`
    position: relative;
    z-index: ${props.theme.eui.euiZNavigation};
    background: ${props.theme.eui.euiColorEmptyShade};
    border-bottom: ${props.theme.eui.euiBorderThin};
    padding: ${props.theme.eui.paddingSizes.m} ${gutterTimeline} ${
    props.theme.eui.paddingSizes.m
  } ${props.theme.eui.paddingSizes.l};

    ${props.isSticky &&
      `
      top: ${offsetChrome}px !important;
    `}

    @media only ${disableSticky} {
      position: static !important;
      z-index: ${props.theme.eui.euiZContent} !important;
    }
  `}
`;
Wrapper.displayName = 'Wrapper';

export interface FiltersGlobalProps {
  children: React.ReactNode;
}

export const FiltersGlobal = pure<FiltersGlobalProps>(({ children }) => (
  <Sticky disableCompensation={disableStickyMq.matches} topOffset={-offsetChrome}>
    {({ style, isSticky }) => (
      <Wrapper className="siemFiltersGlobal" isSticky={isSticky} style={style}>
        {children}
      </Wrapper>
    )}
  </Sticky>
));
FiltersGlobal.displayName = 'FiltersGlobal';
