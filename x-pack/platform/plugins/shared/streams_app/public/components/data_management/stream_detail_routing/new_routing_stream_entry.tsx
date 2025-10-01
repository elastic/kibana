/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { AddRoutingRuleControls } from './control_bars';
import {
  selectCurrentRule,
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { RoutingConditionEditor } from './routing_condition_editor';
import { StreamNameFormRow } from './stream_name_form_row';

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
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup gutterSize="m" direction="column">
          <StreamNameFormRow
            value={currentRule.destination}
            onChange={(value) => changeRule({ destination: value })}
            autoFocus
          />
          <EuiFlexGroup gutterSize="s" direction="column">
            <RoutingConditionEditor
              condition={currentRule.where}
              status={currentRule.status}
              onConditionChange={(cond) => changeRule({ where: cond })}
              onStatusChange={(status) => changeRule({ status })}
            />
            <EuiText size="xs" color="GrayText">
              {i18n.translate('xpack.streams.conditionEditor.filterTip', {
                defaultMessage: 'Tip: You can add a condition directly from a table cell.',
              })}
            </EuiText>
          </EuiFlexGroup>
          <AddRoutingRuleControls />
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
}
