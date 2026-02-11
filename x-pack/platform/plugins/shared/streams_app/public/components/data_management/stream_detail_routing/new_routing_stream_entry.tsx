/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { AddRoutingRuleControls } from './control_bars';
import { RoutingConditionEditor } from './routing_condition_editor';
import {
  selectCurrentRule,
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { StreamNameFormRow, useChildStreamInput } from '../../stream_name_form_row';

export function NewRoutingStreamEntry() {
  const panelRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const { changeRule, changeRuleDebounced } = useStreamRoutingEvents();
  const currentRule = useStreamsRoutingSelector((snapshot) => selectCurrentRule(snapshot.context));

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const { setLocalStreamName, isStreamNameValid, partitionName, prefix, helpText, errorMessage } =
    useChildStreamInput(currentRule.destination);

  return (
    <div ref={panelRef}>
      <EuiPanel
        color="plain"
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        className={css`
          border: 1px solid ${euiTheme.colors.primary};
        `}
      >
        <EuiFlexGroup gutterSize="m" direction="column">
          <StreamNameFormRow
            onChange={(value) => changeRuleDebounced({ destination: value })}
            setLocalStreamName={setLocalStreamName}
            autoFocus
            partitionName={partitionName}
            prefix={prefix}
            helpText={helpText}
            errorMessage={errorMessage}
            isStreamNameValid={isStreamNameValid}
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
          <AddRoutingRuleControls isStreamNameValid={isStreamNameValid} />
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
}
