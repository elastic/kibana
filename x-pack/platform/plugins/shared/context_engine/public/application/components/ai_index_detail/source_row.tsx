/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiCode, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import type { AiIndexSource } from '../../../../common/http_api/ai_indices';
import { toSourceType } from '../../utils/sources';
import { getSourceTypeLabel, SourceTypeBadge } from '../source_picker';

interface SourceRowProps {
  source: AiIndexSource;
  /** Resolved connector name, when the source is a connector. */
  connectorName?: string;
}

export const SourceRow = ({ source, connectorName }: SourceRowProps) => {
  const isConnector = source.type === 'connector';
  const sourceType = toSourceType(source.type);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextAiIndexSourceRow">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            type="space"
            size="m"
            color="subdued"
            name={getSourceTypeLabel(sourceType)}
            iconType={isConnector ? 'plugs' : 'editorCodeBlock'}
            iconColor="primary"
            iconSize="m"
          />
        </EuiFlexItem>
        {/* minWidth: 0 lets the flex item shrink so long queries truncate instead of overflowing the panel */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate">
            <strong>
              {isConnector ? (
                connectorName ?? source.value
              ) : (
                <EuiCode language="sql" transparentBackground>
                  {source.value}
                </EuiCode>
              )}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SourceTypeBadge type={sourceType} data-test-subj="contextAiIndexSourceType" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
