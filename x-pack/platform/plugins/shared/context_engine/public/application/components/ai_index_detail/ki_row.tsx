/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { getKiTypeLabel } from '../../utils/ki_type_labels';

interface KiRowProps {
  ki: KiListItem;
  sourceLabel: string | undefined;
}

const titleStyle = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const capitalizeLabel = (label: string): string =>
  label.length > 0 ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;

export const KiRow = ({ ki, sourceLabel }: KiRowProps) => {
  const typeLabel = capitalizeLabel(getKiTypeLabel(ki.type));
  const metadata = sourceLabel !== undefined ? `${typeLabel} · ${sourceLabel}` : typeLabel;

  return (
    <div data-test-subj="contextKiRow">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiTitle size="xxs">
            <h4 css={titleStyle} data-test-subj="contextKiRowTitle">
              {ki.title}
            </h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued" data-test-subj="contextKiRowMetadata">
            <p>{metadata}</p>
          </EuiText>
        </EuiFlexItem>
        {ki.version !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="contextKiRowVersion">
              {ki.version}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
