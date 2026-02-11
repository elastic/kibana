/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { RoutingConditionEditor } from './routing_condition_editor';
import { EditRoutingRuleControls } from './control_bars';
import { StreamNameFormRow, useChildStreamInput } from '../../stream_name_form_row';
import type { RoutingDefinitionWithUIAttributes } from './types';

export function EditRoutingStreamEntry({
  onChange,
  routingRule,
}: {
  onChange: (child: Partial<RoutingDefinitionWithUIAttributes>) => void;
  routingRule: RoutingDefinitionWithUIAttributes;
}) {
  const { euiTheme } = useEuiTheme();
  const { partitionName, prefix } = useChildStreamInput(routingRule.destination, true);

  return (
    <EuiPanel
      color="plain"
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      data-test-subj={`routingRule-${routingRule.destination}`}
      className={css`
        border: 1px solid ${euiTheme.colors.primary};
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <StreamNameFormRow partitionName={partitionName} prefix={prefix} readOnly />
        <RoutingConditionEditor
          condition={routingRule.where}
          status={routingRule.status}
          onConditionChange={(cond) => onChange({ where: cond })}
          onStatusChange={(status) => onChange({ status })}
        />
        <EuiFlexItem
          className={css`
            padding: 0px;
            padding-top: ${euiTheme.size.l}; //24px
          `}
        >
          <EditRoutingRuleControls routingRule={routingRule} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
