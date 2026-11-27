/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ALL_CONNECTOR_IDS } from '@kbn/workflows';
import { getCachedInferenceConnectorInstances } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import {
  getConnectorInstanceLabel,
  getConnectorInstancesForType,
} from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/connector_id/get_connector_id_suggestions_items';

export interface TriggerConnectorIdFieldProps {
  /** The connector type the trigger's events come from (the trigger spec's `metadata.id`). */
  readonly connectorType: string;
  readonly value: string;
  /** `undefined` when the field is cleared: the key is then removed from the trigger. */
  readonly onChange: (value: string | undefined) => void;
  readonly readOnly?: boolean;
  readonly testSubj: string;
}

/**
 * The `connector-id` of a connector event trigger: every connector of the type (`"*"`), one of the
 * existing connectors (written as its id), or any other text. Unlike a step's, it takes no
 * variables, since the trigger is read as typed.
 */
export function TriggerConnectorIdField({
  connectorType,
  value,
  onChange,
  readOnly = false,
  testSubj,
}: TriggerConnectorIdFieldProps) {
  const connectors = useAvailableConnectors();

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const instances = getConnectorInstancesForType(
      connectorType,
      connectors?.connectorTypes,
      getCachedInferenceConnectorInstances()
    );
    return [
      {
        label: i18n.translate('workflows.triggerConfigPanel.connectorId.all', {
          defaultMessage: 'All connectors of this type',
        }),
        value: ALL_CONNECTOR_IDS,
      },
      // A copy: sorting must not reorder the connectors' own list.
      ...[...instances]
        .sort(
          (a, b) =>
            Number(Boolean(a.isDeprecated)) - Number(Boolean(b.isDeprecated)) ||
            a.name.localeCompare(b.name)
        )
        .map((instance) => ({ label: getConnectorInstanceLabel(instance), value: instance.id })),
    ];
  }, [connectorType, connectors?.connectorTypes]);

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> =
    value === ''
      ? []
      : [options.find((option) => option.value === value) ?? { label: value, value }];

  return (
    <EuiComboBox<string>
      aria-label={i18n.translate('workflows.triggerConfigPanel.connectorId.ariaLabel', {
        defaultMessage: 'Connector',
      })}
      placeholder={i18n.translate('workflows.triggerConfigPanel.connectorId.placeholder', {
        defaultMessage: 'Select a connector or type an ID',
      })}
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={(selected) => onChange(selected[0]?.value)}
      onCreateOption={(text) => {
        const trimmed = text.trim();
        if (trimmed !== '') onChange(trimmed);
      }}
      isDisabled={readOnly}
      isClearable
      compressed
      fullWidth
      data-test-subj={testSubj}
    />
  );
}
