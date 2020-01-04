/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { isEmpty, isEqual, get } from 'lodash/fp';
import React, { memo, useCallback, useState, useEffect } from 'react';

import { IIndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { useFetchIndexPatterns } from '../../../../../containers/detection_engine/rules';
import { DEFAULT_INDEX_KEY } from '../../../../../../common/constants';
import { useUiSetting$ } from '../../../../../lib/kibana';
import * as RuleI18n from '../../translations';
import { DefineStepRule, RuleStep, RuleStepProps } from '../../types';
import { StepRuleDescription } from '../description_step';
import { QueryBarDefineRule } from '../query_bar';
import { Field, Form, FormDataProvider, getUseField, UseField, useForm } from '../shared_imports';
import { schema } from './schema';
import * as i18n from './translations';

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
};

const getStepDefaultValue = (
  indicesConfig: string[],
  defaultValues: DefineStepRule | null
): DefineStepRule => {
  if (defaultValues != null) {
    return {
      ...defaultValues,
      isNew: false,
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
    const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
    const [localUseIndicesConfig, setLocalUseIndicesConfig] = useState(false);
    const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
    const [mylocalIndicesConfig, setMyLocalIndicesConfig] = useState(
      defaultValues != null ? defaultValues.index : indicesConfig ?? []
    );
    const [
      {
        browserFields,
        indexPatterns: indexPatternQueryBar,
        isLoading: indexPatternLoadingQueryBar,
      },
    ] = useFetchIndexPatterns(mylocalIndicesConfig);
    const [myStepData, setMyStepData] = useState<DefineStepRule>(
      getStepDefaultValue(indicesConfig, null)
    );

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
          setLocalUseIndicesConfig(isEqual(myDefaultValues.index, indicesConfig));
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

    const handleResetIndices = useCallback(() => {
      const indexField = form.getFields().index;
      indexField.setValue(indicesConfig);
    }, [indicesConfig]);

    const handleOpenTimelineSearch = useCallback(() => {
      setOpenTimelineSearch(true);
    }, []);

    const handleCloseTimelineSearch = useCallback(() => {
      setOpenTimelineSearch(false);
    }, []);

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
            path="index"
            config={{
              ...schema.index,
              labelAppend: !localUseIndicesConfig ? (
                <EuiButtonEmpty size="xs" onClick={handleResetIndices}>
                  <small>{i18n.RESET_DEFAULT_INDEX}</small>
                </EuiButtonEmpty>
              ) : null,
            }}
            componentProps={{
              idAria: 'detectionEngineStepDefineRuleIndices',
              'data-test-subj': 'detectionEngineStepDefineRuleIndices',
              euiFieldProps: {
                fullWidth: true,
                isDisabled: isLoading,
                placeholder: '',
              },
            }}
          />
          <UseField
            path="queryBar"
            config={{
              ...schema.queryBar,
              labelAppend: (
                <EuiButtonEmpty size="xs" onClick={handleOpenTimelineSearch}>
                  <small>{i18n.IMPORT_TIMELINE_QUERY}</small>
                </EuiButtonEmpty>
              ),
            }}
            component={QueryBarDefineRule}
            componentProps={{
              browserFields,
              loading: indexPatternLoadingQueryBar,
              idAria: 'detectionEngineStepDefineRuleQueryBar',
              indexPattern: indexPatternQueryBar,
              isDisabled: isLoading,
              isLoading: indexPatternLoadingQueryBar,
              dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
              openTimelineSearch,
              onCloseTimelineSearch: handleCloseTimelineSearch,
              resizeParentContainer,
            }}
          />
          <FormDataProvider pathsToWatch="index">
            {({ index }) => {
              if (index != null) {
                if (isEqual(index, indicesConfig) && !localUseIndicesConfig) {
                  setLocalUseIndicesConfig(true);
                }
                if (!isEqual(index, indicesConfig) && localUseIndicesConfig) {
                  setLocalUseIndicesConfig(false);
                }
                if (index != null && !isEmpty(index) && !isEqual(index, mylocalIndicesConfig)) {
                  setMyLocalIndicesConfig(index);
                }
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
                  {RuleI18n.CONTINUE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  }
);
