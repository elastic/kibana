/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface OverviewFooterItemProps {
  icon: 'machineLearningApp' | 'documentation' | 'dashboardApp';
  title: string;
  description: string;
  docLink: string;
  callToAction: React.ReactNode;
}

export const OverviewFooterItem: FC<OverviewFooterItemProps> = ({
  icon,
  title,
  description,
  docLink,
  callToAction,
}) => (
  <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        display="base"
        color="primary"
        href={docLink}
        iconType={icon}
        aria-label={i18n.translate('xpack.ml.overviewFooterItem.documentationLink', {
          defaultMessage: 'Documentation link',
        })}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{description}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiSpacer size="s" />
      {callToAction}
    </EuiFlexItem>
  </EuiFlexGroup>
);
