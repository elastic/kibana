/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButtonIcon, EuiSpacer } from '@elastic/eui';
import {
  HEADER_NAME_LABEL,
  HEADER_VALUE_LABEL,
  ADD_HEADER_BUTTON,
  REMOVE_HEADER_BUTTON,
} from './translations';

export function CustomHeadersFields({ readOnly }: { readOnly: boolean }) {
  return (
    <UseArray path="secrets.headers" initialNumberOfItems={1}>
      {({ items, addItem, removeItem }) => {
        return (
          <>
            {items.map((item, index) => (
              <EuiFlexGroup key={item.id} gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <UseField
                    path={`${item.path}.name`}
                    component={Field}
                    config={{
                      label: index === 0 ? HEADER_NAME_LABEL : '',
                    }}
                    componentProps={{
                      euiFieldProps: {
                        placeholder: 'X-Custom-Header',
                        fullWidth: true,
                        disabled: readOnly,
                        'data-test-subj': `secrets.headers[${index}].name`,
                      },
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <UseField
                    path={`${item.path}.value`}
                    component={Field}
                    config={{
                      label: index === 0 ? HEADER_VALUE_LABEL : '',
                      type: 'password',
                    }}
                    componentProps={{
                      euiFieldProps: {
                        type: 'dual',
                        placeholder: 'secret-value',
                        fullWidth: true,
                        disabled: readOnly,
                        'data-test-subj': `secrets.headers[${index}].value`,
                      },
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    onClick={() => removeItem(item.id)}
                    disabled={readOnly || items.length === 1}
                    aria-label={REMOVE_HEADER_BUTTON}
                    style={{ marginTop: index === 0 ? '28px' : '0' }}
                    data-test-subj={`secrets.headers[${index}].remove`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
            <EuiSpacer size="m" />
            <EuiButtonEmpty
              iconType="plus"
              onClick={addItem}
              disabled={readOnly}
              size="s"
              data-test-subj="secrets.headers.add"
            >
              {ADD_HEADER_BUTTON}
            </EuiButtonEmpty>
          </>
        );
      }}
    </UseArray>
  );
}
