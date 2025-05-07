/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RoutingConditionEditor } from '../condition_editor';
import { AddRoutingRuleControls } from './control_bars';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { selectCurrentRule } from './state_management/stream_routing_state_machine';

export function NewRoutingStreamEntry() {
  const panelRef = useRef<HTMLDivElement>(null);

  const { changeRule } = useStreamRoutingEvents();
  const currentRule = useStreamsRoutingSelector((snapshot) => selectCurrentRule(snapshot.context));

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
              value={currentRule.destination}
              fullWidth
              autoFocus
              compressed
              onChange={(e) => changeRule({ destination: e.target.value })}
            />
          </EuiFormRow>
          <RoutingConditionEditor
            condition={currentRule.if}
            onConditionChange={(condition) => changeRule({ if: condition })}
          />
          <AddRoutingRuleControls />
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
}
