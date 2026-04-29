/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFormRowProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEmpty } from 'lodash';
import React, { memo } from 'react';
import { MAX_CATEGORY_LENGTH } from '../../../common/constants';
import type { CategoryField } from './category_component';
import { CategoryComponent } from './category_component';
import { CATEGORY, EMPTY_CATEGORY_VALIDATION_MSG, MAX_LENGTH_ERROR } from './translations';

interface Props {
  isLoading: boolean;
  availableCategories: string[];
  formRowProps?: Partial<EuiFormRowProps>;
}

const getCategoryConfig = (): FieldConfig<CategoryField> => ({
  defaultValue: null,
  validations: [
    {
      validator: ({ value }) => {
        if (value == null) {
          return;
        }

        if (isEmpty(value.trim())) {
          return {
            message: EMPTY_CATEGORY_VALIDATION_MSG,
          };
        }
      },
    },
    {
      validator: ({ value }) => {
        if (value == null) {
          return;
        }

        if (value.length > MAX_CATEGORY_LENGTH) {
          return {
            message: MAX_LENGTH_ERROR('category', MAX_CATEGORY_LENGTH),
          };
        }
      },
    },
  ],
});

const CategoryFormFieldComponent: React.FC<Props> = ({
  isLoading,
  availableCategories,
  formRowProps,
}) => {
  return (
    <UseField<CategoryField> path="category" config={getCategoryConfig()}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        const onChange = (category: string | null) => {
          field.setValue(category);
        };

        return (
          <EuiFormRow
            {...formRowProps}
            label={CATEGORY}
            error={errorMessage}
            isInvalid={isInvalid}
            data-test-subj="caseCategory"
            fullWidth
          >
            <CategoryComponent
              isLoading={isLoading}
              onChange={onChange}
              category={field.value}
              availableCategories={availableCategories}
              isInvalid={isInvalid}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

CategoryFormFieldComponent.displayName = 'CategoryFormFieldComponent';

export const CategoryFormField = memo(CategoryFormFieldComponent);
