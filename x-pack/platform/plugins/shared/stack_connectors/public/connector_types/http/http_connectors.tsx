/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import {
  UseField,
  useFormData,
  useFormContext,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  useConnectorContext,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { isEqual } from 'lodash';

import { useSecretQueryParams } from '../../common/auth/use_secret_query_params';
import { QueryParamFields } from '../../common/auth/query_param_fields';
import * as i18n from './translations';
import * as authI18n from '../../common/auth/translations';

const { urlField } = fieldValidators;

const LazyLoadedAuthConfig = React.lazy(() => import('../../common/auth/auth_config'));

const HttpActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const {
    services: { isWebhookSslWithPfxEnabled: isPfxEnabled },
  } = useConnectorContext();

  const isModified = useFormIsModified();
  const { getFormData, updateFieldValues } = useFormContext();
  const [{ __internal__, id: connectorId }] = useFormData({
    watch: ['__internal__.hasQueryParams', '__internal__.queryParams'],
  });

  const {
    data: secretQueryParamKeys = [],
    isLoading: isLoadingQueryParams,
    isFetching: isFetchingQueryParams,
  } = useSecretQueryParams(connectorId);

  const loadingQueryParams = isLoadingQueryParams || isFetchingQueryParams;
  const hasQueryParams = __internal__ != null ? __internal__.hasQueryParams : false;
  const hasQueryParamsDefaultValue = secretQueryParamKeys.length > 0;

  React.useEffect(() => {
    if (loadingQueryParams) return;

    const formData = getFormData();
    const secretQueryParamKeysSet = new Set(secretQueryParamKeys);
    const currentParams: Array<{ key: string; value: string }> = (
      formData.__internal__?.queryParams ?? []
    ).map((param: { key: string; value: string }) => {
      if (secretQueryParamKeysSet.has(param.key)) {
        return { ...param, value: '' };
      }
      return param;
    });
    const currentParamKeysSet = new Set(currentParams.map((p) => p.key));
    const newSecretParams = secretQueryParamKeys
      .filter((key) => !currentParamKeysSet.has(key))
      .map((key) => ({ key, value: '' }));

    let mergedParams = [...currentParams, ...newSecretParams];

    if (mergedParams.length === 0 && hasQueryParams) {
      mergedParams = [{ key: '', value: '' }];
    }

    if (!isEqual(currentParams, mergedParams)) {
      updateFieldValues({
        __internal__: {
          ...formData.__internal__,
          ...(!isModified && { hasQueryParams: mergedParams.length > 0 }),
          queryParams: mergedParams,
        },
      });
    }
  }, [
    connectorId,
    getFormData,
    secretQueryParamKeys,
    updateFieldValues,
    hasQueryParams,
    loadingQueryParams,
    isModified,
  ]);

  return (
    <>
      <UseField
        path="config.url"
        config={{
          label: i18n.BASE_URL_LABEL,
          validations: [
            {
              validator: urlField(i18n.BASE_URL_INVALID),
            },
          ],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'httpUrlText',
            fullWidth: true,
            placeholder: 'https://example.com/api/v1',
          },
        }}
      />
      <EuiSpacer size="m" />
      <React.Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyLoadedAuthConfig
          readOnly={readOnly}
          isPfxEnabled={isPfxEnabled}
          isOAuth2Enabled={true}
        />
      </React.Suspense>
      <EuiSpacer size="m" />
      <UseField
        style={{ visibility: loadingQueryParams ? 'hidden' : 'visible' }}
        path="__internal__.hasQueryParams"
        component={ToggleField}
        config={{
          defaultValue: hasQueryParamsDefaultValue,
          label: authI18n.QUERY_PARAMS_SWITCH,
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewQueryParamsSwitch',
          },
        }}
      />
      {loadingQueryParams ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>{hasQueryParams && <QueryParamFields readOnly={readOnly} />}</>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpActionConnectorFields as default };
