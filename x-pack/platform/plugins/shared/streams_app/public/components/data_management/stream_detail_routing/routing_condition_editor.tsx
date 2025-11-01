/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiForm, EuiFormRow, EuiIconTip, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RoutingDefinition } from '@kbn/streams-schema';
import { isRoutingEnabled } from '@kbn/streams-schema';
import React from 'react';
import { useRoutingFieldSuggestions } from '../../../hooks/use_field_suggestions';
import { useRoutingValueSuggestions } from '../../../hooks/use_value_suggestions';
import { getFilterConditionField } from '../../../util/condition';
import type { ConditionEditorProps } from '../shared/condition_editor';
import { ConditionEditor } from '../shared/condition_editor';

type RoutingConditionChangeParams = Omit<RoutingDefinition, 'destination'>;

export type RoutingConditionEditorProps = Omit<ConditionEditorProps, 'fieldSuggestions'> & {
  onStatusChange: (params: RoutingConditionChangeParams['status']) => void;
};

export function RoutingConditionEditor(props: RoutingConditionEditorProps) {
  const isEnabled = isRoutingEnabled(props.status);
  const fieldSuggestions = useRoutingFieldSuggestions();
  const valueSuggestions = useRoutingValueSuggestions(getFilterConditionField(props.condition));

  return (
    <EuiForm fullWidth>
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {i18n.translate('xpack.streams.routing.conditionEditor.title', {
              defaultMessage: 'Status',
            })}
            <EuiIconTip
              content={i18n.translate('xpack.streams.routing.conditionEditor.disableTooltip', {
                defaultMessage:
                  'When disabled, the routing rule stops sending documents to this stream. It does not remove existing data.',
              })}
            />
          </EuiFlexGroup>
        }
      >
        <EuiSwitch
          label={i18n.translate('xpack.streams.routing.conditionEditor.switch', {
            defaultMessage: 'Enabled',
          })}
          compressed
          checked={isEnabled}
          onChange={(event) => props.onStatusChange(event.target.checked ? 'enabled' : 'disabled')}
        />
      </EuiFormRow>
      <ConditionEditor
        {...props}
        fieldSuggestions={fieldSuggestions}
        valueSuggestions={valueSuggestions}
      />
    </EuiForm>
  );
}
