/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFormRow, EuiCodeBlock } from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues, RuleQuery } from '../types';
import { getBreachQuery } from '../types';
import { FieldGroup } from './field_group';
import { GroupFieldSelect } from '../fields/group_field_select';
import { TimeFieldSelect } from '../fields/time_field_select';

interface ConditionFieldGroupProps {
  includeBase?: boolean;
}

export const ConditionFieldGroup = ({
  includeBase: _includeBase = false,
}: ConditionFieldGroupProps) => {
  const { control } = useFormContext<FormValues>();
  const ruleQuery = useWatch({ control, name: 'query' }) as RuleQuery | undefined;
  const baseQuery = getBreachQuery(ruleQuery);

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.condition', {
        defaultMessage: 'Alert condition',
      })}
    >
      {baseQuery && (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.baseQueryLabel', {
              defaultMessage: 'Base query',
            })}
            fullWidth
          >
            <EuiCodeBlock language="esql" fontSize="m" paddingSize="m" isCopyable>
              {baseQuery}
            </EuiCodeBlock>
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      )}

      <GroupFieldSelect />
      <TimeFieldSelect />
    </FieldGroup>
  );
};
