/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface AssetRowProps {
  id: string;
  title: string;
  appLink?: string;
  /** Optional trailing action slot — unused in read-only scope, reserved for #9345. */
  action?: React.ReactNode;
}

export function AssetRow({ id, title, appLink, action }: AssetRowProps) {
  const nameNode = appLink ? (
    <EuiLink href={appLink} target="_blank" data-test-subj={`assetRow-link-${id}`}>
      {title}
    </EuiLink>
  ) : (
    <EuiText size="s">{title}</EuiText>
  );

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false} data-test-subj={`assetRow-${id}`}>
      <EuiFlexItem>{nameNode}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge iconType="check" color="hollow">
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.installedContent.assetRow.installed"
            defaultMessage="Installed"
          />
        </EuiBadge>
      </EuiFlexItem>
      {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
    </EuiFlexGroup>
  );
}
