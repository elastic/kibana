/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { getSourceDisplay } from './source_display';
import type { SelectedSource } from './types';
import { RemovableConnectorCard } from './connector_card';
import { SourceRemoveButton } from './source_remove_button';

interface ConnectorSourceGridProps {
  sources: SelectedSource[];
  connectorNameById: Map<string, string>;
  connectorActionTypeById: Map<string, string>;
  connectorTypeNameById: Map<string, string>;
  onRemove?: (source: SelectedSource) => void;
  disabled?: boolean;
  addCard?: ReactNode;
}

export const ConnectorSourceGrid = ({
  sources,
  connectorNameById,
  connectorActionTypeById,
  connectorTypeNameById,
  onRemove,
  disabled = false,
  addCard,
}: ConnectorSourceGridProps) => (
  <EuiFlexGrid columns={3} gutterSize="m">
    {sources.map((source, index) => {
      const { icon, label, typeLabel } = getSourceDisplay('connector', source.value, {
        connectorNameById,
        connectorActionTypeById,
        connectorTypeNameById,
      });

      return (
        <EuiFlexItem key={source.value}>
          <RemovableConnectorCard
            icon={icon}
            name={label}
            typeLabel={typeLabel}
            data-test-subj={`contextSelectedSource-connector-${index}`}
            action={
              onRemove ? (
                <SourceRemoveButton
                  label={label}
                  sourceType={source.type}
                  onRemove={() => onRemove(source)}
                  disabled={disabled}
                />
              ) : undefined
            }
          />
        </EuiFlexItem>
      );
    })}
    {addCard ? <EuiFlexItem>{addCard}</EuiFlexItem> : null}
  </EuiFlexGrid>
);
