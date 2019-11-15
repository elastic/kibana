/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';

import {
  UseArray,
  FieldHook,
  UseField,
} from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/components/helpers';

import * as I18n from './translations';

interface AddItemProps {
  addText: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}
export const AddItem = ({ addText, dataTestSubj, field, idAria, isDisabled }: AddItemProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <UseArray path={field.path}>
        {({ items, addItem, removeItem }) => (
          <>
            <div>
              {items.map((item, index) => (
                <div key={item.id}>
                  <UseField
                    path={item.path}
                    component={EuiFieldText}
                    componentProps={{
                      append: (
                        <EuiButtonIcon
                          color="danger"
                          iconType="trash"
                          isDisabled={isDisabled}
                          onClick={() => removeItem(item.id)}
                          aria-label={I18n.DELETE}
                        />
                      ),
                      compressed: true,
                      fullWidth: true,
                      isDisabled,
                    }}
                    defaultValue=""
                    config={{
                      validations: [],
                    }}
                  />
                  {items.length - 1 !== index && <EuiSpacer size="s" />}
                </div>
              ))}
            </div>
            <EuiButtonEmpty size="xs" onClick={addItem} isDisabled={isDisabled}>
              {addText}
            </EuiButtonEmpty>
          </>
        )}
      </UseArray>
    </EuiFormRow>
  );
};

// TODO Only add item when the last one is fill

// TODO Validate URL
// var expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
// var regex = new RegExp(expression);
