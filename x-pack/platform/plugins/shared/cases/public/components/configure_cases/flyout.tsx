/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import type { FormHook, FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/types';

import * as i18n from './translations';

export interface FormState<T extends FormData = FormData, I extends FormData = T> {
  isValid: boolean | undefined;
  submit: FormHook<T, I>['submit'];
}

export interface FlyOutBodyProps<T extends FormData = FormData, I extends FormData = T> {
  onChange: (state: FormState<T, I>) => void;
}

export interface FlyoutProps<T extends FormData = FormData, I extends FormData = T> {
  disabled: boolean;
  isLoading: boolean;
  onCloseFlyout: () => void;
  onSaveField: (data: I) => void;
  renderHeader: () => React.ReactNode;
  children: ({ onChange }: FlyOutBodyProps<T, I>) => React.ReactNode;
}

export const CommonFlyout = <T extends FormData = FormData, I extends FormData = T>({
  onCloseFlyout,
  onSaveField,
  isLoading,
  disabled,
  renderHeader,
  children,
}: FlyoutProps<T, I>) => {
  const [formState, setFormState] = useState<FormState<T, I>>({
    isValid: undefined,
    submit: async () => ({
      isValid: false,
      data: {} as T,
    }),
  });

  const { submit } = formState;

  const handleSaveField = useCallback(async () => {
    const { isValid, data } = await submit();

    if (isValid) {
      /**
       * The serializer transforms the data
       * from the form format to the backend
       * format. The I generic is the correct
       * format of the data.
       */
      onSaveField(data as unknown as I);
    }
  }, [onSaveField, submit]);

  /**
   * The children will call setFormState which in turn will make the parent
   * to rerender which in turn will rerender the children etc.
   * To avoid an infinitive loop we need to memoize the children.
   */
  const memoizedChildren = useMemo(
    () =>
      children({
        onChange: setFormState,
      }),
    [children]
  );

  return (
    <EuiFlyout onClose={onCloseFlyout} data-test-subj="common-flyout">
      <EuiFlyoutHeader hasBorder data-test-subj="common-flyout-header">
        <EuiTitle size="s">
          <h3 id="flyoutTitle">{renderHeader()}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{memoizedChildren}</EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj={'common-flyout-footer'}>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCloseFlyout}
              data-test-subj={'common-flyout-cancel'}
              disabled={disabled}
              isLoading={isLoading}
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSaveField}
                data-test-subj={'common-flyout-save'}
                disabled={disabled}
                isLoading={isLoading}
              >
                {i18n.SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

CommonFlyout.displayName = 'CommonFlyout';
