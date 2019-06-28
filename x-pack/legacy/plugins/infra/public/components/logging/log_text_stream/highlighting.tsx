/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';

export const HighlightMarker = euiStyled.span`
  color: ${props =>
    props.theme.darkMode ? props.theme.eui.euiTextColor : props.theme.eui.euiColorGhost}
  background-color: ${props => props.theme.eui.euiColorSecondary}
`;

export const highlightFieldValue = (
  value: string,
  highlightTerms: string[],
  HighlightComponent: React.ComponentType
) =>
  highlightTerms.reduce<React.ReactNode[]>(
    (fragments, highlightTerm, index) => {
      const lastFragment = fragments[fragments.length - 1];

      if (typeof lastFragment !== 'string') {
        return fragments;
      }

      const highlightTermPosition = lastFragment.indexOf(highlightTerm);

      if (highlightTermPosition > -1) {
        return [
          ...fragments.slice(0, fragments.length - 1),
          lastFragment.slice(0, highlightTermPosition),
          <HighlightComponent key={`highlight-${highlightTerm}-${index}`}>
            {highlightTerm}
          </HighlightComponent>,
          lastFragment.slice(highlightTermPosition + highlightTerm.length),
        ];
      } else {
        return fragments;
      }
    },
    [value]
  );
