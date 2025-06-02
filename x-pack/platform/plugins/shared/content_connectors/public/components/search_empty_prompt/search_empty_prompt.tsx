/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiButtonEmpty,
  EuiBadge,
} from '@elastic/eui';

interface BackButtonProps {
  label: string;
  onClickBack: () => void;
}
interface SearchEmptyPromptProps {
  actions?: React.ReactNode;
  backButton?: BackButtonProps;
  body?: React.ReactNode;
  description?: string;
  icon?: string | React.JSXElementConstructor<any>;
  isComingSoon?: boolean;
  comingSoonLabel?: string;
  title: string;
}

export const SearchEmptyPrompt: React.FC<SearchEmptyPromptProps> = ({
  actions,
  backButton,
  body,
  description,
  icon,
  isComingSoon,
  comingSoonLabel,
  title,
}) => {
  return (
    <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
      <EuiFlexGroup alignItems="center" justifyContent="center" direction="column" gutterSize="l">
        {backButton && (
          <EuiFlexItem>
            <EuiButtonEmpty
              data-test-subj="serverlessSearchElasticManagedWebCrawlerEmptyBackButton"
              iconType="arrowLeft"
              onClick={backButton.onClickBack}
            >
              {backButton.label}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {icon && (
          <EuiFlexItem>
            <EuiIcon size="xxl" type={icon} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {isComingSoon && (
          <EuiFlexItem>
            <EuiBadge color="accent">{comingSoonLabel}</EuiBadge>
          </EuiFlexItem>
        )}
        {description && (
          <EuiFlexItem>
            <EuiText textAlign="center" color="subdued">
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
        )}
        {body && <>{body}</>}
        {actions && (
          <EuiFlexGroup direction="row" gutterSize="m">
            {actions}
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
