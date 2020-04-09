/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { LinkIcon, LinkIconProps } from '../link_icon';
import { Subtitle, SubtitleProps } from '../subtitle';
import { Title } from './title';
import { DraggableArguments, BadgeOptions, TitleProp } from './types';

interface HeaderProps {
  border?: boolean;
  isLoading?: boolean;
}

const Header = styled.header.attrs({
  className: 'siemHeaderPage',
})<HeaderProps>`
  ${({ border, theme }) => css`
    margin-bottom: ${theme.eui.euiSizeL};

    ${border &&
      css`
        border-bottom: ${theme.eui.euiBorderThin};
        padding-bottom: ${theme.eui.paddingSizes.l};
        .euiProgress {
          top: ${theme.eui.paddingSizes.l};
        }
      `}
  `}
`;
Header.displayName = 'Header';

const FlexItem = styled(EuiFlexItem)`
  display: block;
`;
FlexItem.displayName = 'FlexItem';

const LinkBack = styled.div.attrs({
  className: 'siemHeaderPage__linkBack',
})`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    margin-bottom: ${theme.eui.euiSizeS};
  `}
`;
LinkBack.displayName = 'LinkBack';

const Badge = styled(EuiBadge)`
  letter-spacing: 0;
`;
Badge.displayName = 'Badge';

interface BackOptions {
  href: LinkIconProps['href'];
  text: LinkIconProps['children'];
}

export interface HeaderPageProps extends HeaderProps {
  backOptions?: BackOptions;
  badgeOptions?: BadgeOptions;
  children?: React.ReactNode;
  draggableArguments?: DraggableArguments;
  subtitle?: SubtitleProps['items'];
  subtitle2?: SubtitleProps['items'];
  title: TitleProp;
  titleNode?: React.ReactElement;
}

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  backOptions,
  badgeOptions,
  border,
  children,
  draggableArguments,
  isLoading,
  subtitle,
  subtitle2,
  title,
  titleNode,
  ...rest
}) => (
  <Header border={border} {...rest}>
    <EuiFlexGroup alignItems="center">
      <FlexItem>
        {backOptions && (
          <LinkBack>
            <LinkIcon href={backOptions.href} iconType="arrowLeft">
              {backOptions.text}
            </LinkIcon>
          </LinkBack>
        )}

        {titleNode || (
          <Title
            draggableArguments={draggableArguments}
            title={title}
            badgeOptions={badgeOptions}
          />
        )}

        {subtitle && <Subtitle data-test-subj="header-page-subtitle" items={subtitle} />}
        {subtitle2 && <Subtitle data-test-subj="header-page-subtitle-2" items={subtitle2} />}
        {border && isLoading && <EuiProgress size="xs" color="accent" />}
      </FlexItem>

      {children && (
        <FlexItem data-test-subj="header-page-supplements" grow={false}>
          {children}
        </FlexItem>
      )}
    </EuiFlexGroup>
  </Header>
);

export const HeaderPage = React.memo(HeaderPageComponent);
