/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSuperSelect, EuiText, type EuiSuperSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CatalogueEnumField } from '@kbn/streams-schema';
import { resolveEnumOptions } from '../../../services/component_catalogue';
import { useDefinitionFormContext } from '../form_context';
import type { FormValue } from '../values';

const NONE_VALUE = '';

interface EnumControlProps {
  field: CatalogueEnumField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  isInvalid: boolean;
  controlId: string;
  allowEmpty: boolean;
}

export function EnumControl({
  field,
  value,
  onChange,
  isInvalid,
  controlId,
  allowEmpty,
}: EnumControlProps) {
  const { metadata, telemetry } = useDefinitionFormContext();
  const options = useMemo(
    () => resolveEnumOptions(field, metadata, telemetry),
    [field, metadata, telemetry]
  );

  const selectOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
    const mapped = options.map((option) => {
      const label = option.label ?? String(option.value);
      return {
        value: String(option.value),
        disabled: option.disabled,
        inputDisplay: label,
        dropdownDisplay: option.description ? (
          <>
            <strong>{label}</strong>
            <EuiText size="xs" color="subdued">
              <p>{option.description}</p>
            </EuiText>
          </>
        ) : (
          label
        ),
      };
    });
    if (!allowEmpty) {
      return mapped;
    }
    return [
      {
        value: NONE_VALUE,
        inputDisplay: (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.componentDefinitionForm.enum.noneOption', {
              defaultMessage: 'None',
            })}
          </EuiText>
        ),
      },
      ...mapped,
    ];
  }, [allowEmpty, options]);

  return (
    <EuiSuperSelect
      id={controlId}
      aria-label={field.label ?? field.name}
      compressed
      fullWidth
      isInvalid={isInvalid}
      options={selectOptions}
      valueOfSelected={value === undefined || value === null ? NONE_VALUE : String(value)}
      placeholder={field.ui?.placeholder}
      onChange={(selected) => {
        const match = options.find((option) => String(option.value) === selected);
        onChange(match?.value);
      }}
      data-test-subj={`componentDefinitionFormEnum-${field.name}`}
    />
  );
}
