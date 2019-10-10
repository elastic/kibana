/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

const SubtitleWrapper = styled.div.attrs({
  className: 'siemSubtitle',
})`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeS};

    p {
      color: ${theme.eui.textColors.subdued};
      font-size: ${theme.eui.euiFontSizeXS};
      line-height: ${theme.eui.euiLineHeight};

      @media only screen and (min-width: ${theme.eui.euiBreakpoints.s}) {
        display: inline-block;
        margin-right: ${theme.eui.euiSize};

        &:last-child {
          margin-right: 0;
        }
      }
    }
  `}
`;
SubtitleWrapper.displayName = 'SubtitleWrapper';

export interface SubtitleProps {
  text: string | string[] | React.ReactNode;
}

export const Subtitle = React.memo<SubtitleProps>(({ text }) => {
  return (
    <SubtitleWrapper>
      {Array.isArray(text) ? (
        (text as string[]).map((textItem, i) => <p key={i}>{textItem}</p>)
      ) : (
        <p>{text}</p>
      )}
    </SubtitleWrapper>
  );
});
Subtitle.displayName = 'Subtitle';
