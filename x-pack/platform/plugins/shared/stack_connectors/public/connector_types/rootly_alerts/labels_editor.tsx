/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import type { ActionVariable } from '@kbn/alerting-plugin/common';
import { TextFieldWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import type { AlertLabel } from '@kbn/connector-schemas/rootly_alerts';
import * as i18n from './translations';

interface LabelsEditorProps {
  labels: AlertLabel[];
  onChange: (labels: AlertLabel[]) => void;
  index: number;
  messageVariables?: ActionVariable[];
  errors: string[];
}

export const LabelsEditor: React.FunctionComponent<LabelsEditorProps> = ({
  labels,
  onChange,
  index,
  messageVariables,
  errors,
}) => {
  const updateLabel = (row: number, changes: Partial<AlertLabel>) =>
    onChange(labels.map((label, i) => (i === row ? { ...label, ...changes } : label)));

  return (
    <>
      <EuiFormRow fullWidth error={errors} isInvalid={errors.length > 0}>
        <>
          {labels.map((label, row) => (
            <EuiFlexGroup key={row} gutterSize="s" alignItems="flexEnd" responsive={false}>
              <EuiFlexItem grow={2}>
                <EuiFormRow fullWidth label={i18n.LABEL_NAME_LABEL}>
                  <EuiFieldText
                    fullWidth
                    value={label.key}
                    data-test-subj={`rootlyAlertsLabelKey-${row}`}
                    onChange={(e) => updateLabel(row, { key: e.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiFormRow fullWidth label={i18n.LABEL_VALUE_LABEL}>
                  <TextFieldWithMessageVariables
                    index={index}
                    editAction={(_property: string, value: string) => updateLabel(row, { value })}
                    messageVariables={messageVariables}
                    paramsProperty={`labelValue-${row}`}
                    aria-label={i18n.LABEL_VALUE_LABEL}
                    inputTargetValue={label.value}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.LABEL_REMOVE_ARIA_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={i18n.LABEL_REMOVE_ARIA_LABEL}
                    data-test-subj={`rootlyAlertsLabelRemove-${row}`}
                    onClick={() => onChange(labels.filter((_label, i) => i !== row))}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </>
      </EuiFormRow>
      <EuiFlexGroup justifyContent="flexStart" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="plusCircle"
            data-test-subj="rootlyAlertsLabelAdd"
            onClick={() => onChange([...labels, { key: '', value: '' }])}
          >
            {i18n.LABEL_ADD_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
