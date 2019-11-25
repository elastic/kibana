/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { useFetchIndexPatterns } from '../../../../../containers/detection_engine/rules/fetch_index_patterns';
import { DEFAULT_INDEX_KEY, DEFAULT_SIGNALS_INDEX_KEY } from '../../../../../../common/constants';
import { useKibanaUiSetting } from '../../../../../lib/settings/use_kibana_ui_setting';
import * as CreateRuleI18n from '../../translations';
import { RuleStep, RuleStepProps } from '../../types';
import { QueryBarDefineRule } from '../query_bar';
import { Field, Form, FormDataProvider, getUseField, UseField, useForm } from '../shared_imports';
import { schema } from './schema';
import * as I18n from './translations';

const CommonUseField = getUseField({ component: Field });

export const StepDefineRule = memo<RuleStepProps>(({ isLoading, setStepData }) => {
  const [initializeOutputIndex, setInitializeOutputIndex] = useState(true);
  const [localUseIndicesConfig, setLocalUseIndicesConfig] = useState('');
  const [
    { indexPatterns: indexPatternQueryBar, isLoading: indexPatternLoadingQueryBar },
    setIndices,
  ] = useFetchIndexPatterns();
  const [indicesConfig] = useKibanaUiSetting(DEFAULT_INDEX_KEY);
  const [signalIndexConfig] = useKibanaUiSetting(DEFAULT_SIGNALS_INDEX_KEY);

  const { form } = useForm({
    schema,
    defaultValue: {
      index: indicesConfig || [],
      outputIndex: signalIndexConfig,
      queryBar: {
        query: { query: '', language: 'kuery' },
        filters: [],
        saved_id: null,
      },
      useIndicesConfig: 'true',
    },
    options: { stripEmptyFields: false },
  });

  const onSubmit = useCallback(async () => {
    const { isValid: newIsValid, data } = await form.submit();
    if (newIsValid) {
      setStepData(RuleStep.defineRule, data, newIsValid);
    }
  }, [form]);

  useEffect(() => {
    if (signalIndexConfig != null && initializeOutputIndex) {
      const outputIndexField = form.getFields().outputIndex;
      outputIndexField.setValue(signalIndexConfig);
      setInitializeOutputIndex(false);
    }
  }, [initializeOutputIndex, signalIndexConfig, form]);

  return (
    <>
      <Form form={form} data-test-subj="stepDefineRule">
        <CommonUseField
          path="useIndicesConfig"
          componentProps={{
            idAria: 'detectionEngineStepDefineRuleUseIndicesConfig',
            'data-test-subj': 'detectionEngineStepDefineRuleUseIndicesConfig',
            euiFieldProps: {
              disabled: isLoading,
              options: [
                {
                  id: 'true',
                  label: I18n.CONFIG_INDICES,
                },
                {
                  id: 'false',
                  label: I18n.CUSTOM_INDICES,
                },
              ],
            },
          }}
        />
        <CommonUseField
          path="index"
          componentProps={{
            idAria: 'detectionEngineStepDefineRuleIndices',
            'data-test-subj': 'detectionEngineStepDefineRuleIndices',
            euiFieldProps: {
              compressed: true,
              fullWidth: true,
              isDisabled: isLoading,
            },
          }}
        />
        <UseField
          path="queryBar"
          component={QueryBarDefineRule}
          componentProps={{
            compressed: true,
            loading: indexPatternLoadingQueryBar,
            idAria: 'detectionEngineStepDefineRuleQueryBar',
            indexPattern: indexPatternQueryBar,
            isDisabled: isLoading,
            isLoading: indexPatternLoadingQueryBar,
            dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
          }}
        />
        <CommonUseField
          path="outputIndex"
          componentProps={{
            idAria: 'detectionEngineStepDefineRuleOutputIndex',
            'data-test-subj': 'detectionEngineStepDefineRuleOutputIndex',
            euiFieldProps: {
              compressed: true,
              fullWidth: false,
              disabled: isLoading,
            },
          }}
        />
        <FormDataProvider pathsToWatch="useIndicesConfig">
          {({ useIndicesConfig }) => {
            if (localUseIndicesConfig !== useIndicesConfig) {
              const indexField = form.getFields().index;
              if (
                indexField != null &&
                useIndicesConfig === 'true' &&
                !isEqual(indexField.value, indicesConfig)
              ) {
                indexField.setValue(indicesConfig);
                setIndices(indicesConfig);
              } else if (
                indexField != null &&
                useIndicesConfig === 'false' &&
                !isEqual(indexField.value, [])
              ) {
                indexField.setValue([]);
                setIndices([]);
              }
              setLocalUseIndicesConfig(useIndicesConfig);
            }

            return null;
          }}
        </FormDataProvider>
      </Form>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onSubmit} isDisabled={isLoading}>
            {CreateRuleI18n.CONTINUE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
