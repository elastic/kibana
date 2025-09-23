import React from 'react';
import { isRoutingEnabled, RoutingDefinition } from '@kbn/streams-schema';
import { useRoutingFieldSuggestions } from '@kbn/streams-app-plugin/public/hooks/use_field_suggestions';
import { EuiFlexGroup, EuiForm, EuiFormRow, EuiIconTip, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConditionEditor, ConditionEditorProps } from '../shared/condition_editor';

type RoutingConditionChangeParams = Omit<RoutingDefinition, 'destination'>;

export type RoutingConditionEditorProps = Omit<ConditionEditorProps, 'fieldSuggestions'> & {
  onStatusChange: (params: RoutingConditionChangeParams['status']) => void;
};

export function RoutingConditionEditor(props: RoutingConditionEditorProps) {
  const isEnabled = isRoutingEnabled(props.status);
  const fieldSuggestions = useRoutingFieldSuggestions();

  return (
    <EuiForm fullWidth>
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {i18n.translate('xpack.streams.conditionEditor.title', {
              defaultMessage: 'Status',
            })}
            <EuiIconTip
              content={i18n.translate('xpack.streams.conditionEditor.disableTooltip', {
                defaultMessage:
                  'When disabled, the routing rule stops sending documents to this stream. It does not remove existing data.',
              })}
            />
          </EuiFlexGroup>
        }
      >
        <EuiSwitch
          label={i18n.translate('xpack.streams.conditionEditor.switch', {
            defaultMessage: 'Enabled',
          })}
          compressed
          checked={isEnabled}
          onChange={(event) => props.onStatusChange(event.target.checked ? 'enabled' : 'disabled')}
        />
      </EuiFormRow>
      <ConditionEditor {...props} fieldSuggestions={fieldSuggestions} />
    </EuiForm>
  );
}
