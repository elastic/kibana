/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { RoutingConditionEditor } from '../condition_editor';
import { EditRoutingRuleControls } from './control_bars';
import { StreamNameFormRow } from './stream_name_form_row';
import type { RoutingDefinitionWithUIAttributes } from './types';

export function EditRoutingStreamEntry({
  onChange,
  routingRule,
}: {
  onChange: (child: Partial<RoutingDefinitionWithUIAttributes>) => void;
  routingRule: RoutingDefinitionWithUIAttributes;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={`routingRule-${routingRule.destination}`}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <StreamNameFormRow value={routingRule.destination} disabled />
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
