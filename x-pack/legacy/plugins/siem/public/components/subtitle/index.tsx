/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeS};

    .siemSubtitle__item {
      @media only screen and (min-width: ${theme.eui.euiBreakpoints.s}) {
        display: inline-block;
        margin-right: ${theme.eui.euiSize};

        &:last-child {
          margin-right: 0;
        }
      }
    }

    .siemSubtitle__item--text {
      color: ${theme.eui.textColors.subdued};
      font-size: ${theme.eui.euiFontSizeXS};
      line-height: ${theme.eui.euiLineHeight};
    }
  `}
`;
Wrapper.displayName = 'Wrapper';

interface SubtitleItemProps {
  children: string | React.ReactNode;
  key?: number;
}

const SubtitleItem = React.memo<SubtitleItemProps>(({ children, key }) => {
  if (typeof children === 'string') {
    return (
      <p className="siemSubtitle__item siemSubtitle__item--text" key={key}>
        {children}
      </p>
    );
  } else {
    return (
      <div className="siemSubtitle__item siemSubtitle__item--node" key={key}>
        {children}
      </div>
    );
  }
});
SubtitleItem.displayName = 'SubtitleItem';

export interface SubtitleProps {
  items: string | React.ReactNode | Array<string | React.ReactNode>;
}

export const Subtitle = React.memo<SubtitleProps>(({ items }) => {
  return (
    <Wrapper className="siemSubtitle">
      {Array.isArray(items) ? (
        items.map((item, i) => <SubtitleItem key={i}>{item}</SubtitleItem>)
      ) : (
        <SubtitleItem>{items}</SubtitleItem>
      )}
    </Wrapper>
  );
});
Subtitle.displayName = 'Subtitle';
