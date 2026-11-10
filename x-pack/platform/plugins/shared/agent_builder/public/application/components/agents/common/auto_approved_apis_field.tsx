/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiComboBoxOptionMatcher, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHighlight,
  EuiText,
  euiTextTruncate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { apiTargets, type ApiTarget } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import type { AutoApprovedApisValue } from '../../../utils/auto_approved_apis';
import {
  destructiveApiSelectorOptionsByTarget,
  type ApiSelectorOption,
} from './api_selector_options';

const targetLabels: Record<ApiTarget, string> = {
  elasticsearch: labels.autoApprovedApis.elasticsearchLabel,
  kibana: labels.autoApprovedApis.kibanaLabel,
};

const allApisDescriptions: Record<ApiTarget, (count: number) => string> = {
  elasticsearch: labels.autoApprovedApis.allElasticsearchApisDescription,
  kibana: labels.autoApprovedApis.allKibanaApisDescription,
};

const optionRowHeight = 48;

const singleLineStyles = css(euiTextTruncate());

const describeSelector = (target: ApiTarget, option: ApiSelectorOption): string => {
  if (option.kind === 'all') {
    return allApisDescriptions[target](option.apiCount);
  }
  if (option.kind === 'namespace') {
    return labels.autoApprovedApis.namespaceApisDescription(option.namespace, option.apiCount);
  }
  return option.description;
};

const toOption = (
  target: ApiTarget,
  selector: string,
  description?: string
): EuiComboBoxOptionOption<string> => ({
  key: selector,
  label: selector,
  value: description,
  'data-test-subj': `agentBuilderAutoApprovedApiOption-${target}-${selector}`,
});

const toOptions = (target: ApiTarget): Array<EuiComboBoxOptionOption<string>> =>
  destructiveApiSelectorOptionsByTarget[target].map((option) =>
    toOption(target, option.selector, describeSelector(target, option))
  );

const optionsByTarget: Record<ApiTarget, Array<EuiComboBoxOptionOption<string>>> = {
  elasticsearch: toOptions('elasticsearch'),
  kibana: toOptions('kibana'),
};

const toSearchTerms = (searchValue: string): string[] =>
  searchValue.toLowerCase().split(/\s+/).filter(Boolean);

const matchesEverySearchTerm: EuiComboBoxOptionMatcher<string> = ({
  option: { label, value: description = '' },
  searchValue,
}) => {
  const searchableTexts = [label.toLowerCase(), description.toLowerCase()];
  return toSearchTerms(searchValue).every((term) =>
    searchableTexts.some((text) => text.includes(term))
  );
};

const renderOption = (
  { label, value: description }: EuiComboBoxOptionOption<string>,
  searchValue: string,
  contentClassName: string
) => {
  const searchTerms = toSearchTerms(searchValue);
  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={contentClassName}>
      <EuiText size="s" css={singleLineStyles} title={label}>
        <EuiHighlight search={searchTerms} highlightAll>
          {label}
        </EuiHighlight>
      </EuiText>
      {description && (
        <EuiText size="xs" color="subdued" css={singleLineStyles} title={description}>
          <EuiHighlight search={searchTerms} highlightAll>
            {description}
          </EuiHighlight>
        </EuiText>
      )}
    </EuiFlexGroup>
  );
};

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
              optionMatcher={matchesEverySearchTerm}
              renderOption={renderOption}
              rowHeight={optionRowHeight}
              isDisabled={isDisabled}
              data-test-subj={`agentBuilderAutoApprovedApis-${target}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
      ))}
      {isDisabled && disabledReason && (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="agentBuilderAutoApprovedApisDisabledReason"
          >
            <p>{disabledReason}</p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
