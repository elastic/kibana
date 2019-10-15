/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import styled, { css } from 'styled-components';

/**
 * UTILITY BAR
 */

export interface BarProps {
  border?: boolean;
}

export const Bar = styled.aside.attrs({
  className: 'siemUtilityBar',
})<BarProps>`
  ${({ border, theme }) => css`
    ${border &&
      css`
        border-bottom: ${theme.eui.euiBorderThin};
        padding-bottom: ${theme.eui.paddingSizes.s};
      `}

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.l}) {
      display: flex;
      justify-content: space-between;
    }
  `}
`;
Bar.displayName = 'Bar';

export const BarSection = styled.div.attrs({
  className: 'siemUtilityBar__section',
})`
  ${({ theme }) => css`
    & + & {
      margin-top: ${theme.eui.euiSizeS};
    }

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.m}) {
      display: flex;
      flex-wrap: wrap;
    }

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.l}) {
      & + & {
        margin-top: 0;
        margin-left: ${theme.eui.euiSize};
      }
    }
  `}
`;
BarSection.displayName = 'BarSection';

export const BarGroup = styled.div.attrs({
  className: 'siemUtilityBar__group',
})`
  ${({ theme }) => css`
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;

    & + & {
      margin-top: ${theme.eui.euiSizeS};
    }

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.m}) {
      border-right: ${theme.eui.euiBorderThin};
      flex-wrap: nowrap;
      margin-right: ${theme.eui.paddingSizes.m};
      padding-right: ${theme.eui.paddingSizes.m};

      & + & {
        margin-top: 0;
      }

      &:last-child {
        border-right: none;
        margin-right: 0;
        padding-right: 0;
      }
    }

    & > * {
      font-size: ${theme.eui.euiFontSizeXS};
      line-height: ${theme.eui.euiLineHeight};
      margin-right: ${theme.eui.euiSize};
      white-space: nowrap;

      &:last-child {
        margin-right: 0;
      }
    }
  `}
`;
BarGroup.displayName = 'BarGroup';

export const BarText = styled.p.attrs({
  className: 'siemUtilityBar__text',
})`
  ${({ theme }) => css`
    color: ${theme.eui.textColors.subdued};
    display: inline-block;
  `}
`;
BarText.displayName = 'BarText';

export interface BarActionProps {
  children: React.ReactNode;
  href?: string;
  iconSide?: 'left' | 'right';
  onClick?: Function;
}

export const BarAction = styled(EuiLink).attrs({
  className: 'siemUtilityBar__action',
})<BarActionProps>`
  ${({ iconSide, theme }) => css`
    align-items: center;
    display: inline-flex;

    ${iconSide === 'left' &&
      css`
        .euiIcon {
          margin-right: ${theme.eui.euiSizeXS};
        }
      `}

    ${iconSide === 'right' &&
      css`
        flex-direction: row-reverse;

        .euiIcon {
          margin-left: ${theme.eui.euiSizeXS};
        }
      `}
  `}
`;
BarAction.displayName = 'BarAction';
