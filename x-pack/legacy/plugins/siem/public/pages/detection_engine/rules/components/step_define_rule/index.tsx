/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { isEqual, get } from 'lodash/fp';
import React, { memo, useCallback, useState, useEffect } from 'react';

import { IIndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { useUiSetting$ } from '../../../../../../../../../../src/plugins/kibana_react/public';
import { useFetchIndexPatterns } from '../../../../../containers/detection_engine/rules';
import { DEFAULT_INDEX_KEY } from '../../../../../../common/constants';
import * as RuleI18n from '../../translations';
import { DefineStepRule, RuleStep, RuleStepProps } from '../../types';
import { StepRuleDescription } from '../description_step';
import { QueryBarDefineRule } from '../query_bar';
import { Field, Form, FormDataProvider, getUseField, UseField, useForm } from '../shared_imports';
import { schema } from './schema';
import * as I18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface StepDefineRuleProps extends RuleStepProps {
  defaultValues?: DefineStepRule | null;
}

const stepDefineDefaultValue = {
  index: [],
  isNew: true,
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  useIndicesConfig: 'true',
};

const getStepDefaultValue = (
  indicesConfig: string[],
  defaultValues: DefineStepRule | null
): DefineStepRule => {
  if (defaultValues != null) {
    return {
      ...defaultValues,
      isNew: false,
      useIndicesConfig: `${isEqual(defaultValues.index, indicesConfig)}`,
    };
  } else {
    return {
      ...stepDefineDefaultValue,
      index: indicesConfig != null ? indicesConfig : [],
    };
  }
};

export const StepDefineRule = memo<StepDefineRuleProps>(
  ({
    defaultValues,
    descriptionDirection = 'row',
    isReadOnlyView,
    isLoading,
    isUpdateView = false,
    resizeParentContainer,
    setForm,
    setStepData,
  }) => {
    const [localUseIndicesConfig, setLocalUseIndicesConfig] = useState('');
    const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
    const [
      { indexPatterns: indexPatternQueryBar, isLoading: indexPatternLoadingQueryBar },
      setIndices,
    ] = useFetchIndexPatterns(defaultValues != null ? defaultValues.index : indicesConfig ?? []);
    const [myStepData, setMyStepData] = useState<DefineStepRule>(stepDefineDefaultValue);

    const { form } = useForm({
      defaultValue: myStepData,
      options: { stripEmptyFields: false },
      schema,
    });

    const onSubmit = useCallback(async () => {
      if (setStepData) {
        setStepData(RuleStep.defineRule, null, false);
        const { isValid, data } = await form.submit();
        if (isValid && setStepData) {
          setStepData(RuleStep.defineRule, data, isValid);
          setMyStepData({ ...data, isNew: false } as DefineStepRule);
        }
      }
    }, [form]);

    useEffect(() => {
      if (indicesConfig != null && defaultValues != null) {
        const myDefaultValues = getStepDefaultValue(indicesConfig, defaultValues);
        if (!isEqual(myDefaultValues, myStepData)) {
          setMyStepData(myDefaultValues);
          setLocalUseIndicesConfig(myDefaultValues.useIndicesConfig);
          if (!isReadOnlyView) {
            Object.keys(schema).forEach(key => {
              const val = get(key, myDefaultValues);
              if (val != null) {
                form.setFieldValue(key, val);
              }
            });
          }
        }
      }
    }, [defaultValues, indicesConfig]);

    useEffect(() => {
      if (setForm != null) {
        setForm(RuleStep.defineRule, form);
      }
    }, [form]);

    return isReadOnlyView && myStepData != null ? (
      <StepRuleDescription
        direction={descriptionDirection}
        indexPatterns={indexPatternQueryBar as IIndexPattern}
        schema={schema}
        data={myStepData}
      />
    ) : (
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
              resizeParentContainer,
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
                  isEqual(indexField.value, indicesConfig)
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
        {!isUpdateView && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="xs"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={onSubmit} isDisabled={isLoading}>
                  {myStepData.isNew ? RuleI18n.CONTINUE : RuleI18n.UPDATE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  }
);
