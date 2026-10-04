/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import { apiTargets, type ApiTarget } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import type { AutoApprovedApisValue } from '../../../utils/auto_approved_apis';
import { useApiSelectors } from '../../../hooks/agents/use_api_selectors';

const targetLabels: Record<ApiTarget, string> = {
  elasticsearch: labels.autoApprovedApis.elasticsearchLabel,
  kibana: labels.autoApprovedApis.kibanaLabel,
};

const toOption = (target: ApiTarget, selector: string): EuiComboBoxOptionOption<string> => ({
  key: selector,
  label: selector,
  'data-test-subj': `agentBuilderAutoApprovedApiOption-${target}-${selector}`,
});

export interface AutoApprovedApisFieldProps {
  value: AutoApprovedApisValue | undefined;
  onChange: (value: Record<ApiTarget, string[]>) => void;
  isDisabled: boolean;
  disabledReason?: string;
}

export const AutoApprovedApisField = ({
  value = {},
  onChange,
  isDisabled,
  disabledReason,
}: AutoApprovedApisFieldProps) => {
  const { selectorsByTarget, isLoading } = useApiSelectors();

  // Options stay ungrouped: EuiComboBox keeps its virtualized row heights cached across searches,
  // so group labels end up with another row's height once the list is filtered.
  const optionsByTarget = useMemo(
    () =>
      selectorsByTarget
        ? {
            elasticsearch: selectorsByTarget.elasticsearch.map((selector) =>
              toOption('elasticsearch', selector)
            ),
            kibana: selectorsByTarget.kibana.map((selector) => toOption('kibana', selector)),
          }
        : { elasticsearch: [], kibana: [] },
    [selectorsByTarget]
  );

  const handleChange = useCallback(
    (target: ApiTarget, selectedOptions: Array<EuiComboBoxOptionOption<string>>) =>
      onChange({
        elasticsearch: value.elasticsearch ?? [],
        kibana: value.kibana ?? [],
        [target]: selectedOptions.map(({ label }) => label),
      }),
    [onChange, value]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="agentBuilderAutoApprovedApis">
      {apiTargets.map((target) => (
        <EuiFlexItem grow={false} key={target}>
          <EuiFormRow
            label={targetLabels[target]}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {labels.autoApprovedApis.optionalLabel}
              </EuiText>
            }
            fullWidth
          >
            <EuiComboBox
              fullWidth
              aria-label={targetLabels[target]}
              placeholder={labels.autoApprovedApis.placeholder}
              options={optionsByTarget[target]}
              selectedOptions={(value[target] ?? []).map((selector) => toOption(target, selector))}
              onChange={(selectedOptions) => handleChange(target, selectedOptions)}
              isLoading={isLoading}
              isDisabled={isDisabled}
              data-test-subj={`agentBuilderAutoApprovedApis-${target}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="agentBuilderAutoApprovedApisHelpText">
          <p>{isDisabled && disabledReason ? disabledReason : labels.autoApprovedApis.helpText}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
