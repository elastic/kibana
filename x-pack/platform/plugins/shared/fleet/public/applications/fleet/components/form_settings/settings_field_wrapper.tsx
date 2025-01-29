/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodFirstPartyTypeKind } from '@kbn/zod';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow, EuiLink } from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { useAgentPolicyFormContext } from '../../sections/agent_policy/components/agent_policy_form';

export const convertValue = (
  value: string | boolean,
  type: keyof typeof ZodFirstPartyTypeKind
): any => {
  if (type === ZodFirstPartyTypeKind.ZodNumber) {
    if (value === '') {
      return 0;
    }
    return parseInt(value as string, 10);
  }
  return value;
};

export const validateSchema = (coercedSchema: z.ZodString, newValue: any): string | undefined => {
  const validationResults = coercedSchema.safeParse(newValue);

  if (!validationResults.success) {
    return validationResults.error.issues[0].message;
  }
};

export const SettingsFieldWrapper: React.FC<{
  settingsConfig: SettingsConfig;
  typeName: keyof typeof ZodFirstPartyTypeKind;
  renderItem: Function;
  disabled?: boolean;
}> = ({ settingsConfig, typeName, renderItem, disabled }) => {
  const [error, setError] = useState('');
  const agentPolicyFormContext = useAgentPolicyFormContext();

  const fieldKey = `configuredSetting-${settingsConfig.name}`;
  const defaultValue: number =
    settingsConfig.schema instanceof z.ZodDefault
      ? settingsConfig.schema._def.defaultValue()
      : undefined;
  const coercedSchema = settingsConfig.schema as z.ZodString;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = typeName === ZodFirstPartyTypeKind.ZodBoolean ? e.target.checked : e.target.value;
    const newValue = convertValue(value, typeName);
    const validationError = validateSchema(coercedSchema, newValue);

    if (validationError) {
      setError(validationError);
      agentPolicyFormContext?.updateAdvancedSettingsHasErrors(true);
    } else {
      setError('');
      agentPolicyFormContext?.updateAdvancedSettingsHasErrors(false);
    }

    const newAdvancedSettings = {
      ...(agentPolicyFormContext?.agentPolicy.advanced_settings ?? {}),
      [settingsConfig.api_field.name]: newValue,
    };

    agentPolicyFormContext?.updateAgentPolicy({ advanced_settings: newAdvancedSettings });
  };

  const fieldValue =
    agentPolicyFormContext?.agentPolicy.advanced_settings?.[settingsConfig.api_field.name] ??
    defaultValue;

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h4>{settingsConfig.title}</h4>}
      description={
        <>
          {settingsConfig.description}{' '}
          {settingsConfig.learnMoreLink && (
            <EuiLink href={settingsConfig.learnMoreLink} external>
              <FormattedMessage
                id="xpack.fleet.configuredSettings.learnMoreLinkText"
                defaultMessage="Learn more."
              />
            </EuiLink>
          )}
        </>
      }
    >
      <EuiFormRow isDisabled={disabled} fullWidth key={fieldKey} error={error} isInvalid={!!error}>
        {renderItem({ fieldValue, handleChange, isInvalid: !!error, fieldKey, coercedSchema })}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

export const getInnerType = (schema: z.ZodType<any, any>) => {
  if (schema._def.innerType) {
    return schema._def.innerType._def.typeName === 'ZodEffects'
      ? schema._def.innerType._def.schema._def.typeName
      : schema._def.innerType._def.typeName;
  }
  if (schema._def.typeName === 'ZodEffects') {
    return schema._def.schema._def.typeName;
  }
  return schema._def.typeName;
};
