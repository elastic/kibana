/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import { FieldHook } from '../../../../../shared_imports';
import { RuleType } from '../../../../../containers/detection_engine/rules/types';
import * as i18n from './translations';
import { isMlRule } from '../../helpers';

const MlCardDescription = ({ hasValidLicense = false }: { hasValidLicense: boolean }) => (
  <EuiText size="s">
    {hasValidLicense ? (
      i18n.ML_TYPE_DESCRIPTION
    ) : (
      <FormattedMessage
        id="xpack.siem.detectionEngine.createRule.stepDefineRule.ruleTypeField.mlTypeDisabledDescription"
        defaultMessage="Access to ML requires a {subscriptionsLink}."
        values={{
          subscriptionsLink: (
            <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
              <FormattedMessage
                id="xpack.siem.components.stepDefineRule.ruleTypeField.subscriptionsLink"
                defaultMessage="Platinum subscription"
              />
            </EuiLink>
          ),
        }}
      />
    )}
  </EuiText>
);

interface SelectRuleTypeProps {
  describedByIds: string[];
  field: FieldHook;
  hasValidLicense: boolean;
  isReadOnly: boolean;
}

export const SelectRuleType: React.FC<SelectRuleTypeProps> = ({
  describedByIds = [],
  field,
  hasValidLicense = false,
  isReadOnly = false,
}) => {
  const ruleType = field.value as RuleType;
  const setType = useCallback(
    (type: RuleType) => {
      field.setValue(type);
    },
    [field]
  );
  const setMl = useCallback(() => setType('machine_learning'), [setType]);
  const setQuery = useCallback(() => setType('query'), [setType]);

  return (
    <EuiFormRow
      fullWidth
      data-test-subj="selectRuleType"
      describedByIds={describedByIds}
      label={field.label}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiCard
            title={i18n.QUERY_TYPE_TITLE}
            description={i18n.QUERY_TYPE_DESCRIPTION}
            icon={<EuiIcon size="l" type="search" />}
            selectable={{
              isDisabled: isReadOnly,
              onClick: setQuery,
              isSelected: !isMlRule(ruleType),
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            title={i18n.ML_TYPE_TITLE}
            description={<MlCardDescription hasValidLicense={hasValidLicense} />}
            icon={<EuiIcon size="l" type="machineLearningApp" />}
            selectable={{
              isDisabled: isReadOnly || !hasValidLicense,
              onClick: setMl,
              isSelected: isMlRule(ruleType),
            }}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiFormRow>
  );
};
