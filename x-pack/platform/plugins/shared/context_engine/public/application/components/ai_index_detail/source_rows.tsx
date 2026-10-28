/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import type { AiIndexSource } from '../../../../common/http_api/ai_indices';
import { toSourceType } from '../../utils/sources';
import { getSourceDisplay } from '../source_display';
import { SourceRow } from '../source_row';

export interface SourceRowsProps {
  sources: AiIndexSource[];
  connectorNameById: Map<string, string>;
  connectorActionTypeById: Map<string, string>;
  emptyMessage: ReactNode;
}

export const SourceRows = ({
  sources,
  connectorNameById,
  connectorActionTypeById,
  emptyMessage,
}: SourceRowsProps) => {
  if (sources.length === 0) {
    return (
      <EuiText size="xs" color="subdued">
        {emptyMessage}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {sources.map((source) => {
        const { label, typeLabel, icon, content } = getSourceDisplay(
          toSourceType(source.type),
          source.value,
          { connectorNameById, connectorActionTypeById }
        );
        return (
          <EuiFlexItem key={`${source.type}-${source.value}`}>
            <SourceRow
              label={label}
              typeLabel={typeLabel}
              icon={icon}
              data-test-subj="contextAiIndexSourceRow"
            >
              {content}
            </SourceRow>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
