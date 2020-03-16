/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { sortBy } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiComboBox } from '@elastic/eui';

import { useRules } from '../../containers/detection_engine/rules';

interface Props {
  // alertParams: IndexThresholdAlertParams;
  alertInterval: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAlertParams: (property: string, value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAlertProperty: (key: string, value: any) => void;
  errors: { [key: string]: string[] };
  // alertsContext: AlertsContextValue;
}

interface RuleOption {
  label: string;
  value: string;
}

const RulesNotificationExpressionComponent: React.FC<Props> = props => {
  console.error('props', props);
  const [selectedRules, setSelectedRules] = useState<RuleOption[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');

  const [loading, rules] = useRules({
    pagination: {
      page: 1,
      perPage: 50,
      total: 50,
    },
    filterOptions: {
      filter: searchValue,
      sortField: 'enabled', // Only enabled is supported for sorting currently
      sortOrder: 'asc',
      showCustomRules: false,
      showElasticRules: false,
    },
  });

  const options: RuleOption[] = useMemo(() => {
    if (!rules?.data.length) {
      return [];
    }

    const rulesOptions = rules?.data.map(rule => ({
      label: rule.name,
      value: rule.rule_id,
    }));

    return sortBy('label', rulesOptions);
  }, [rules?.data]);

  const onChange = useCallback(
    value => {
      setSelectedRules(value as RuleOption[]);
      props.setAlertParams(
        'ruleIds',
        value.map((item: RuleOption) => item.value)
      );
      setSearchValue('');
    },
    [setSelectedRules, props.setAlertParams]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiComboBox
          placeholder="Select from a list of options"
          options={options}
          isLoading={loading}
          selectedOptions={selectedRules}
          onChange={onChange}
          isClearable={true}
          // TODO: throttle
          onSearchChange={setSearchValue}
          // TOOD: add onBlur
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RulesNotificationExpression = React.memo(RulesNotificationExpressionComponent);
