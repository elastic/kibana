/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiFlexGroup, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RoutingDefinition } from '@kbn/streams-schema';
import React, { useEffect, useRef } from 'react';
import { RoutingConditionEditor } from '../condition_editor';
import { ControlBar } from './control_bar';

export function NewRoutingStreamEntry({
  child,
  onChildChange,
}: {
  child: RoutingDefinition;
  onChildChange: (child?: RoutingDefinition) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div ref={panelRef}>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s">
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.streams.streamDetailRouting.name', {
              defaultMessage: 'Stream name',
            })}
          >
            <EuiFieldText
              data-test-subj="streamsAppRoutingStreamEntryNameField"
              value={child.destination}
              fullWidth
              autoFocus
              compressed
              onChange={(e) => {
                onChildChange({
                  ...child,
                  destination: e.target.value,
                });
              }}
            />
          </EuiFormRow>
          <RoutingConditionEditor
            condition={child.if}
            onConditionChange={(condition) => {
              onChildChange({
                ...child,
                if: condition,
              });
            }}
          />
          <ControlBar />
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
}
