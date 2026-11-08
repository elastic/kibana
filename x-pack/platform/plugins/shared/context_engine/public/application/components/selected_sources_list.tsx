/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { getSourceDisplay } from './source_display';
import type { SelectedSource } from './source_picker';
import { SourceRow } from './source_row';

interface SelectedSourcesListProps {
  sources: SelectedSource[];
  connectorNameById: Map<string, string>;
  connectorActionTypeById: Map<string, string>;
  onRemove: (source: SelectedSource) => void;
  disabled?: boolean;
  animateOnMount?: boolean;
}

/**
 * Renders removable rows for a single type's selected sources, within a {@link SourceTypePanel}.
 */
export const SelectedSourcesList = ({
  sources,
  connectorNameById,
  connectorActionTypeById,
  onRemove,
  disabled = false,
  animateOnMount = false,
}: SelectedSourcesListProps) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {sources.map((source, index) => {
      const { label, typeLabel, icon, content } = getSourceDisplay(source.type, source.value, {
        connectorNameById,
        connectorActionTypeById,
      });

      return (
        <EuiFlexItem key={`${source.type}-${source.id}`}>
          <SourceRow
            animateOnMount={animateOnMount}
            label={label}
            typeLabel={typeLabel}
            icon={icon}
            sourceType={source.type}
            onRemove={() => onRemove(source)}
            disabled={disabled}
            data-test-subj={`contextSelectedSource-${source.type}-${index}`}
          >
            {content}
          </SourceRow>
        </EuiFlexItem>
      );
    })}
  </EuiFlexGroup>
);
