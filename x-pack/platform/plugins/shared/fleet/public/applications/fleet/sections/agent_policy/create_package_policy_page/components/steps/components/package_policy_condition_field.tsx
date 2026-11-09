/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldText, EuiFormRow, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';

import { useStartServices } from '../../../../../../hooks';

export interface PackagePolicyConditionFieldProps {
  value: string;
  onChange: (value: string | null) => void;
  isInvalid: boolean;
  errors: string[] | null;
  compressed?: boolean;
  /**
   * Show the help text in an info icon tooltip next to the label instead of under the field. The
   * learn more link stays under the field, where it can be clicked.
   */
  helpTextAsTooltip?: boolean;
  dataTestSubj?: string;
}

export const PackagePolicyConditionField: React.FunctionComponent<
  PackagePolicyConditionFieldProps
> = ({
  value,
  onChange,
  isInvalid,
  errors,
  compressed = false,
  helpTextAsTooltip = false,
  dataTestSubj = 'packagePolicyConditionInput',
}) => {
  const { docLinks } = useStartServices();
  const learnMoreLink = (
    <EuiLink href={docLinks.links.fleet.elasticAgentInputConditions} target="_blank">
      {i18n.translate('xpack.fleet.packagePolicy.conditionField.learnMoreLink', {
        defaultMessage: 'Learn more',
      })}
    </EuiLink>
  );

  return (
    <EuiFormRow
      fullWidth
      display={compressed ? 'rowCompressed' : undefined}
      label={
        <>
          <FormattedMessage
            id="xpack.fleet.packagePolicy.conditionField.label"
            defaultMessage="Condition"
          />
          {helpTextAsTooltip && (
            <>
              {' '}
              <EuiIconTip
                type="info"
                color="subdued"
                content={i18n.translate('xpack.fleet.packagePolicy.conditionField.tooltip', {
                  defaultMessage: 'Only collect data when this condition is met.',
                })}
                anchorProps={{ 'data-test-subj': `${dataTestSubj}-helpTooltip` }}
              />
            </>
          )}
        </>
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
        helpTextAsTooltip ? (
          learnMoreLink
        ) : (
          <FormattedMessage
            id="xpack.fleet.packagePolicy.conditionField.helpText"
            defaultMessage="Only collect data when this condition is met. {learnMore}."
            values={{ learnMore: learnMoreLink }}
          />
        )
      }
      isInvalid={isInvalid}
      error={errors ?? []}
    >
      <EuiFieldText
        fullWidth
        compressed={compressed}
        isInvalid={isInvalid}
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
