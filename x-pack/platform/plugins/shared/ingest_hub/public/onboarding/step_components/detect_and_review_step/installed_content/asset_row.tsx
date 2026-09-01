/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface AssetRowProps {
  id: string;
  title: string;
  appLink?: string;
  /** Optional trailing action slot — unused in read-only scope, reserved for #9345. */
  action?: React.ReactNode;
}

export function AssetRow({ id, title, appLink, action }: AssetRowProps) {
  const { services } = useKibana<CoreStart>();
  const href = appLink ? services.http.basePath.prepend(appLink) : undefined;

  const nameNode = href ? (
    <EuiLink href={href} target="_blank" data-test-subj={`assetRow-link-${id}`}>
      {title}
    </EuiLink>
  ) : (
    <EuiText size="s">{title}</EuiText>
  );

  return (
    <EuiPanel paddingSize="s" hasBorder hasShadow={false} data-test-subj={`assetRow-${id}`}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem>{nameNode}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="check" color="success">
            <FormattedMessage
              id="xpack.ingestHub.detectAndReviewStep.installedContent.assetRow.installed"
              defaultMessage="Installed"
            />
          </EuiBadge>
        </EuiFlexItem>
        {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
