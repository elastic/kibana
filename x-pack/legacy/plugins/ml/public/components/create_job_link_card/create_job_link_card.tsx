/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactElement } from 'react';

import {
  EuiIcon,
  IconType,
  EuiText,
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiLink,
} from '@elastic/eui';

interface Props {
  icon: IconType | ReactElement;
  iconAreaLabel?: string;
  title: any;
  description: any;
  href?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

// Component for rendering a card which links to the Create Job page, displaying an
// icon, card title, description and link.
export const CreateJobLinkCard: FC<Props> = ({
  icon,
  iconAreaLabel,
  title,
  description,
  onClick,
  href,
  isDisabled,
  'data-test-subj': dateTestSubj,
}) => {
  const linkHrefAndOnClickProps = {
    ...(href ? { href } : {}),
    ...(onClick ? { onClick } : {}),
  };
  return (
    <EuiPanel style={{ cursor: isDisabled ? 'not-allowed' : undefined }}>
      <EuiLink
        style={{
          display: 'block',
          pointerEvents: isDisabled ? 'none' : undefined,
          background: 'transparent',
          outline: 'none',
        }}
        data-test-subj={dateTestSubj}
        color="subdued"
        {...linkHrefAndOnClickProps}
      >
        <EuiFlexGroup gutterSize="l" responsive={true}>
          <EuiFlexItem grow={false} style={{ paddingTop: '8px' }}>
            {typeof icon === 'string' ? (
              <EuiIcon size="xl" type={icon} aria-label={iconAreaLabel} />
            ) : (
              icon
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h4>{title}</h4>
            </EuiTitle>
            <EuiText color="subdued">
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiPanel>
  );
};
