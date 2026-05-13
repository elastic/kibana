/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiDescribedFormGroup, EuiFormRow, EuiLink } from '@elastic/eui';

import type { SettingsConfig } from '../../../../../common/settings/types';
import { useAgentPolicyFormContext } from '../../sections/agent_policy/components/agent_policy_form';

export const ZodSchemaType = {
  object: 'object',
  number: 'number',
  string: 'string',
  enum: 'enum',
  boolean: 'boolean',
} as const;

export type ZodSchemaTypeName = (typeof ZodSchemaType)[keyof typeof ZodSchemaType];

export const convertValue = (value: string | boolean, type: ZodSchemaTypeName): any => {
  if (type === ZodSchemaType.number) {
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

const renderer = {
  renderCode: (code: string) => <EuiCode>{code}</EuiCode>,
};

export const SettingsFieldWrapper: React.FC<{
  settingsConfig: SettingsConfig;
  typeName: ZodSchemaTypeName;
  renderItem: Function;
  disabled?: boolean;
}> = ({ settingsConfig, typeName, renderItem, disabled }) => {
  const [error, setError] = useState('');
  const agentPolicyFormContext = useAgentPolicyFormContext();

  const fieldKey = `configuredSetting-${settingsConfig.name}`;
  const defaultValue =
    settingsConfig.schema instanceof z.ZodDefault
      ? settingsConfig.schema.parse(undefined)
      : undefined;
  const coercedSchema = settingsConfig.schema as z.ZodString;

  const applyValidationResult = (validationError: string | undefined) => {
    if (validationError) {
      setError(validationError);
      agentPolicyFormContext?.updateAdvancedSettingsHasErrors(true);
    } else {
      setError('');
      agentPolicyFormContext?.updateAdvancedSettingsHasErrors(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = typeName === ZodSchemaType.boolean ? e.target.checked : e.target.value;
    const newValue = convertValue(value, typeName);

    try {
      applyValidationResult(validateSchema(coercedSchema, newValue));
    } catch {
      // Schema has async refinements (e.g. yaml validation), fall back to async validation
      coercedSchema.safeParseAsync(newValue).then((result) => {
        applyValidationResult(result.success ? undefined : result.error.issues[0].message);
      });
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
          {settingsConfig.description({ renderer })}{' '}
          {settingsConfig.learnMoreLink && (
            <EuiLink href={settingsConfig.learnMoreLink} external target="_blank">
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

const getV4TypeName = (schema: any): string | undefined => schema?._zod?.def?.type;
const getV3TypeName = (schema: any): string | undefined => schema?._def?.typeName;

const normalizeTypeName = (typeName?: string): string | undefined => {
  const typeMap: Record<string, string> = {
    ZodObject: ZodSchemaType.object,
    ZodNumber: ZodSchemaType.number,
    ZodString: ZodSchemaType.string,
    ZodEnum: ZodSchemaType.enum,
    ZodBoolean: ZodSchemaType.boolean,
  };

  return typeName ? typeMap[typeName] ?? typeName : undefined;
};

const unwrapAndGetTypeName = (schema: any): string | undefined => {
  const v4TypeName = getV4TypeName(schema);

  if (v4TypeName) {
    if (v4TypeName === 'default' || v4TypeName === 'optional') {
      return unwrapAndGetTypeName(schema?._zod?.def?.innerType);
    }

    if (v4TypeName === 'pipe') {
      return unwrapAndGetTypeName(schema?._zod?.def?.out ?? schema?._zod?.def?.in);
    }

    return normalizeTypeName(v4TypeName);
  }

  const v3TypeName = getV3TypeName(schema);

  if (v3TypeName) {
    if (v3TypeName === 'ZodDefault' || v3TypeName === 'ZodOptional') {
      return unwrapAndGetTypeName(schema?._def?.innerType);
    }

    if (v3TypeName === 'ZodEffects') {
      return unwrapAndGetTypeName(schema?._def?.schema);
    }

    return normalizeTypeName(v3TypeName);
  }

  return undefined;
};

export const getInnerType = (schema: z.ZodType<any, any>): ZodSchemaTypeName | '' =>
  (unwrapAndGetTypeName(schema) as ZodSchemaTypeName | undefined) ?? '';
