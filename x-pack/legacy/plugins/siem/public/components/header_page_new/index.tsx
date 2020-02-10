/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { DefaultDraggable } from '../draggables';
import { LinkIcon, LinkIconProps } from '../link_icon';
import { Subtitle, SubtitleProps } from '../subtitle';
import * as i18n from './translations';

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

const StyledEuiBetaBadge = styled(EuiBetaBadge)`
  vertical-align: middle;
`;

StyledEuiBetaBadge.displayName = 'StyledEuiBetaBadge';

const StyledEuiButtonIcon = styled(EuiButtonIcon)`
  ${({ theme }) => css`
    margin-left: ${theme.eui.euiSize};
  `}
`;

StyledEuiButtonIcon.displayName = 'StyledEuiButtonIcon';

interface BackOptions {
  href: LinkIconProps['href'];
  text: LinkIconProps['children'];
}

interface BadgeOptions {
  beta?: boolean;
  text: string;
  tooltip?: string;
}

interface DraggableArguments {
  field: string;
  value: string;
}
interface IconAction {
  'aria-label': string;
  iconType: string;
  onChange: (a: string) => void;
  onClick: (b: boolean) => void;
  onSubmit: () => void;
}

export interface HeaderPageProps extends HeaderProps {
  backOptions?: BackOptions;
  badgeOptions?: BadgeOptions;
  children?: React.ReactNode;
  draggableArguments?: DraggableArguments;
  isEditTitle?: boolean;
  iconAction?: IconAction;
  subtitle2?: SubtitleProps['items'];
  subtitle?: SubtitleProps['items'];
  title: string | React.ReactNode;
}

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  backOptions,
  badgeOptions,
  border,
  children,
  draggableArguments,
  isEditTitle,
  iconAction,
  isLoading,
  subtitle,
  subtitle2,
  title,
  ...rest
}) => (
  <Header border={border} {...rest}>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <FlexItem grow={false}>
        {backOptions && (
          <LinkBack>
            <LinkIcon href={backOptions.href} iconType="arrowLeft">
              {backOptions.text}
            </LinkIcon>
          </LinkBack>
        )}

        {isEditTitle && iconAction ? (
          <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFieldText
                onChange={e => iconAction.onChange(e.target.value)}
                value={`${title}`}
              />
            </EuiFlexItem>
            <EuiFlexGroup gutterSize="none" responsive={false} wrap={true}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isDisabled={isLoading}
                  isLoading={isLoading}
                  onClick={iconAction.onSubmit}
                >
                  {i18n.SUBMIT}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => iconAction.onClick(false)}>
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexItem />
          </EuiFlexGroup>
        ) : (
          <EuiTitle size="l">
            <h1 data-test-subj="header-page-title">
              {!draggableArguments ? (
                title
              ) : (
                <DefaultDraggable
                  data-test-subj="header-page-draggable"
                  id={`header-page-draggable-${draggableArguments.field}-${draggableArguments.value}`}
                  field={draggableArguments.field}
                  value={`${draggableArguments.value}`}
                />
              )}
              {badgeOptions && (
                <>
                  {' '}
                  {badgeOptions.beta ? (
                    <StyledEuiBetaBadge
                      label={badgeOptions.text}
                      tooltipContent={badgeOptions.tooltip}
                      tooltipPosition="bottom"
                    />
                  ) : (
                    <Badge color="hollow">{badgeOptions.text}</Badge>
                  )}
                </>
              )}
              {iconAction && (
                <StyledEuiButtonIcon
                  aria-label={iconAction['aria-label']}
                  iconType={iconAction.iconType}
                  onClick={() => iconAction.onClick(true)}
                />
              )}
            </h1>
          </EuiTitle>
        )}

        {subtitle && <Subtitle data-test-subj="header-page-subtitle" items={subtitle} />}
        {subtitle2 && <Subtitle data-test-subj="header-page-subtitle-2" items={subtitle2} />}
        {border && isLoading && <EuiProgress size="xs" color="accent" />}
      </FlexItem>

      {children && <FlexItem data-test-subj="header-page-supplements">{children}</FlexItem>}
    </EuiFlexGroup>
  </Header>
);

export const HeaderPage = React.memo(HeaderPageComponent);
