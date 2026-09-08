/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldText, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';

import { useStartServices } from '../../../../../../hooks';

export const PackagePolicyConditionField: React.FunctionComponent<{
  value: string;
  onChange: (value: string | null) => void;
  isInvalid: boolean;
  errors: string[] | null;
  dataTestSubj?: string;
}> = ({ value, onChange, isInvalid, errors, dataTestSubj = 'packagePolicyConditionInput' }) => {
  const { docLinks } = useStartServices();
  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.fleet.packagePolicy.conditionField.label"
          defaultMessage="Condition"
        />
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.fleet.packagePolicy.conditionField.optionalLabel"
            defaultMessage="Optional"
          />
        </EuiText>
      }
      helpText={
        <FormattedMessage
          id="xpack.fleet.packagePolicy.conditionField.helpText"
          defaultMessage="Only collect data when this condition is met. {learnMore}."
          values={{
            learnMore: (
              <EuiLink href={docLinks.links.fleet.elasticAgentInputConditions} target="_blank">
                {i18n.translate('xpack.fleet.packagePolicy.conditionField.learnMoreLink', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            ),
          }}
        />
      }
      isInvalid={isInvalid}
      error={errors ?? []}
    >
      <EuiFieldText
        fullWidth
        isInvalid={isInvalid}
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
