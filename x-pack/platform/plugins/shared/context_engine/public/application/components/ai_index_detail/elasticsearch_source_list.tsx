/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { Fragment } from 'react';
import { getSourceDisplay } from './source_display';
import type { SelectedSource } from './types';
import { SourceRemoveButton } from './source_remove_button';

const emptyConnectorMaps = {
  connectorNameById: new Map<string, string>(),
  connectorActionTypeById: new Map<string, string>(),
  connectorTypeNameById: new Map<string, string>(),
};

interface ElasticsearchSourceListProps {
  sources: SelectedSource[];
  onRemove?: (source: SelectedSource) => void;
  disabled?: boolean;
  emptyMessage: ReactNode;
}

export const ElasticsearchSourceList = ({
  sources,
  onRemove,
  disabled = false,
  emptyMessage,
}: ElasticsearchSourceListProps) => {
  const { euiTheme } = useEuiTheme();

  if (sources.length === 0) {
    return (
      <EuiText size="xs" color="subdued">
        {emptyMessage}
      </EuiText>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="none">
      {sources.map((source, index) => {
        const display = getSourceDisplay('esql', source.value, emptyConnectorMaps);

        return (
          <Fragment key={source.value}>
            {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
            <EuiFlexGroup
              alignItems="center"
              gutterSize="m"
              responsive={false}
              data-test-subj={`contextSelectedSource-${source.type}-${index}`}
              css={{ padding: euiTheme.size.m }}
            >
              <EuiFlexItem grow={false}>{display.icon}</EuiFlexItem>
              <EuiFlexItem css={{ minWidth: 0 }}>
                <EuiText size="s" className="eui-textTruncate">
                  <strong>{display.content}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="contextSourceTypeBadge">
                  {display.typeLabel}
                </EuiBadge>
              </EuiFlexItem>
              {onRemove ? (
                <EuiFlexItem grow={false}>
                  <SourceRemoveButton
                    label={source.value}
                    sourceType={source.type}
                    onRemove={() => onRemove(source)}
                    disabled={disabled}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </Fragment>
        );
      })}
    </EuiPanel>
  );
};
