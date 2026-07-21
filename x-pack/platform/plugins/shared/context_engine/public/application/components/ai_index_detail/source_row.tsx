/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import type { AiIndexSource } from '../../../../common/http_api/ai_indices';
import { toSourceType } from '../../utils/sources';
import { SourceTypeBadge } from '../source_picker';

interface SourceRowProps {
  source: AiIndexSource;
}

export const SourceRow = ({ source }: SourceRowProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="contextAiIndexSourceRow">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="editorCodeBlock" size="l" aria-hidden={true} />
      </EuiFlexItem>
      {/* minWidth: 0 lets the flex item shrink so long queries truncate instead of overflowing the panel */}
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiText size="s" color="subdued" className="eui-textTruncate">
          <EuiCode language="sql" transparentBackground>
            {source.value}
          </EuiCode>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SourceTypeBadge
          type={toSourceType(source.type)}
          data-test-subj="contextAiIndexSourceType"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
