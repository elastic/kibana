/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon, EuiFormRow } from '@elastic/eui';

import { FieldHook } from '../../../../../shared_imports';
import { RuleType } from '../../../../../containers/detection_engine/rules/types';
import * as i18n from './translations';
import { isMlRule } from '../../helpers';

interface SelectRuleTypeProps {
  field: FieldHook;
}

const Wrapper = styled(EuiFormRow)``;

export const SelectRuleType = ({ field }: SelectRuleTypeProps) => {
  const [ruleType, setRuleType] = useState<RuleType>(field.value as RuleType);
  const setType = useCallback(
    (type: RuleType) => {
      setRuleType(type);
      field.setValue(type);
    },
    [field]
  );
  const setMl = useCallback(() => setType('machine_learning'), [setType]);
  const setQuery = useCallback(() => setType('query'), [setType]);
  const license = true; // TODO

  return (
    <Wrapper label={field.label} fullWidth>
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiCard
            title={i18n.QUERY_TYPE_TITLE}
            description={i18n.QUERY_TYPE_DESCRIPTION}
            icon={<EuiIcon size="l" type="search" />}
            selectable={{
              onClick: setQuery,
              isSelected: !isMlRule(ruleType),
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            title={i18n.ML_TYPE_TITLE}
            description={license ? i18n.ML_TYPE_DESCRIPTION : i18n.ML_TYPE_DISABLED_DESCRIPTION}
            isDisabled={!license}
            icon={<EuiIcon size="l" type="machineLearningApp" />}
            selectable={{
              onClick: setMl,
              isSelected: isMlRule(ruleType),
            }}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </Wrapper>
  );
};
