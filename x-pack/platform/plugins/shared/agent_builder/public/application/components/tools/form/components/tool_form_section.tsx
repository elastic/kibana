/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { isEqual } from 'lodash';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import React, { memo } from 'react';
import { i18nMessages } from '../i18n';

export interface ToolFormSectionDocumentation {
  title: string;
  href: string;
}

export interface ToolFormSectionProps {
  title: string;
  icon: IconType;
  description: string;
  content?: ReactNode;
  documentation?: ToolFormSectionDocumentation;
}
export const ToolFormSection: FC<PropsWithChildren<ToolFormSectionProps>> = memo(
  ({ children, title, icon, description, content, documentation }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem grow={0}>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    {icon && <EuiIcon type={icon} />}
                    <EuiText color={euiTheme.colors.textHeading}>
                      <h3>{title}</h3>
                    </EuiText>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    {description}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {content && <EuiFlexItem grow={0}>{content}</EuiFlexItem>}
            {documentation && (
              <EuiFlexItem>
                <EuiLink href={documentation.href} target="_blank">
                  {i18nMessages.documentationLinkLabel} - {documentation.title}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          grow={2}
          css={css`
            overflow-x: auto; /* Fixes a bug where the ES|QL editor misbehaves on horizontal resize */
          `}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  (
    { documentation: prevDocumentation, ...prev },
    { documentation: nextDocumentation, ...next }
  ) => {
    return (
      Object.keys(prev).every((key) => {
        const prop = key as keyof Omit<ToolFormSectionProps, 'documentation'>;
        return prev[prop] === next[prop];
      }) && isEqual(prevDocumentation, nextDocumentation)
    );
  }
);
