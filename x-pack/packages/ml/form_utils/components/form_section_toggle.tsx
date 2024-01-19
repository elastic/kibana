/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { useDispatch } from 'react-redux';
import type { Draft } from 'immer';

import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { useFormSection } from '../use_form_sections';
import { capitalizeFirstLetter } from '../utils/capitalize_first_letter';
import type { FormSection } from '../form_section';

import type { FormSectionToggleProps } from './types';

export const FormSectionToggle = <FF extends string, FS extends string, VN extends string>({
  children,
  slice,
  section,
  label,
  helpText,
  disabled = false,
}: PropsWithChildren<FormSectionToggleProps<FF, FS, VN>>) => {
  const dispatch = useDispatch();
  const { enabled: checked } = useFormSection(slice, section);
  const upperCaseSection = capitalizeFirstLetter(section as string);
  const name = `${slice.name}${upperCaseSection}`;

  return (
    <>
      <EuiFormRow helpText={helpText}>
        <EuiSwitch
          name={name}
          label={label}
          checked={checked && !disabled}
          onChange={(e) =>
            dispatch(
              slice.actions.setFormSection({
                section: section as keyof Draft<Record<FS, FormSection<FS>>>,
                enabled: e.target.checked,
              })
            )
          }
          disabled={disabled}
          data-test-subj={name}
        />
      </EuiFormRow>
      {!disabled && checked ? children : null}
    </>
  );
};
