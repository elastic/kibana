/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiCallOut,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { pick } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import useObservable from 'react-use/lib/useObservable';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import useMountedState from 'react-use/lib/useMountedState';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContextProvider } from '../../hooks/use_data_source';
import type { PatternAnalysisEmbeddableRuntimeState } from './types';
import { PatternAnalysisSettings } from '../../components/log_categorization/log_categorization_for_embeddable/embeddable_menu';
import { TimeFieldWarning } from '../../components/time_field_warning';
import { RandomSampler } from '../../components/log_categorization/sampling_menu';
import {
  DEFAULT_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
} from '../../components/log_categorization/sampling_menu/random_sampler';
import {
  DEFAULT_MINIMUM_TIME_RANGE_OPTION,
  type MinimumTimeRangeOption,
} from '../../components/log_categorization/log_categorization_for_embeddable/minimum_time_range';
import { getMessageField } from '../../components/log_categorization/utils';
import { FieldSelector } from '../../components/log_categorization/log_categorization_for_embeddable/field_selector';
import { SamplingPanel } from '../../components/log_categorization/sampling_menu/sampling_panel';

export interface PatternAnalysisInitializerProps {
  initialInput?: Partial<PatternAnalysisEmbeddableRuntimeState>;
  onCreate: (props: PatternAnalysisEmbeddableRuntimeState) => void;
  onCancel: () => void;
  onPreview: (update: PatternAnalysisEmbeddableRuntimeState) => Promise<void>;
  isNewPanel: boolean;
}

export const PatternAnalysisEmbeddableInitializer: FC<PatternAnalysisInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
  onPreview,
  isNewPanel,
}) => {
  const {
    data: { dataViews },
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = useAiopsAppContext();

  const [formInput, setFormInput] = useState<PatternAnalysisEmbeddableRuntimeState>(
    pick(
      initialInput ?? {
        minimumTimeRangeOption: DEFAULT_MINIMUM_TIME_RANGE_OPTION,
        randomSamplerMode: RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
        randomSamplerProbability: DEFAULT_PROBABILITY,
      },
      [
        'dataViewId',
        'fieldName',
        'minimumTimeRangeOption',
        'randomSamplerMode',
        'randomSamplerProbability',
      ]
    ) as PatternAnalysisEmbeddableRuntimeState
  );
  const [isFormValid, setIsFormValid] = useState(true);

  const updatedProps = useMemo(() => {
    return {
      ...formInput,
      title: isPopulatedObject(formInput)
        ? i18n.translate('xpack.aiops.embeddablePatternAnalysis.attachmentTitle', {
            defaultMessage: 'Pattern analysis: {fieldName}',
            values: {
              fieldName: formInput.fieldName,
            },
          })
        : '',
    };
  }, [formInput]);

  useEffect(
    function previewChanges() {
      if (isFormValid && updatedProps.fieldName !== undefined) {
        onPreview(updatedProps);
      }
    },
    [isFormValid, onPreview, updatedProps]
  );

  const setDataViewId = useCallback(
    (dataViewId: string | undefined) => {
      setFormInput({
        ...formInput,
        dataViewId: dataViewId ?? '',
        fieldName: undefined,
      });
      setIsFormValid(false);
    },
    [formInput]
  );

  return (
    <>
      <EuiFlyoutHeader
        hasBorder={true}
        css={{
          pointerEvents: 'auto',
          backgroundColor: euiThemeVars.euiColorEmptyShade,
        }}
      >
        <EuiTitle size="s" data-test-subj="inlineEditingFlyoutLabel">
          <h2>
            {isNewPanel
              ? i18n.translate('xpack.aiops.embeddablePatternAnalysis.config.title.new', {
                  defaultMessage: 'Create pattern analysis',
                })
              : i18n.translate('xpack.aiops.embeddablePatternAnalysis.config.title.edit', {
                  defaultMessage: 'Edit pattern analysis',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.aiops.embeddablePatternAnalysis.config.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <IndexPatternSelect
              autoFocus={!formInput.dataViewId}
              fullWidth
              compressed
              indexPatternId={formInput.dataViewId}
              placeholder={i18n.translate(
                'xpack.aiops.embeddablePatternAnalysis.config.dataViewSelectorPlaceholder',
                {
                  defaultMessage: 'Select data view',
                }
              )}
              onChange={(newId) => {
                setDataViewId(newId ?? '');
              }}
            />
          </EuiFormRow>
          <DataSourceContextProvider dataViews={dataViews} dataViewId={formInput.dataViewId}>
            <EuiSpacer />

            <FormControls
              formInput={formInput}
              onChange={setFormInput}
              onValidationChange={setIsFormValid}
            />
          </DataSourceContextProvider>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              size="m"
              onClick={onCancel}
              data-test-subj="aiopsPatternAnalysisCancelButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddablePatternAnalysis.config.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreate.bind(null, updatedProps)}
              fill
              aria-label={i18n.translate(
                'xpack.aiops.embeddablePatternAnalysis.config.applyFlyoutAriaLabel',
                {
                  defaultMessage: 'Apply changes',
                }
              )}
              isDisabled={!isFormValid}
              iconType="check"
              data-test-subj="aiopsPatternAnalysisConfirmButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddablePatternAnalysis.config.applyAndCloseLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export const FormControls: FC<{
  formInput: PatternAnalysisEmbeddableRuntimeState;
  onChange: (update: PatternAnalysisEmbeddableRuntimeState) => void;
  onValidationChange: (isValid: boolean) => void;
}> = ({ formInput, onChange, onValidationChange }) => {
  const dataViewId = formInput.dataViewId;
  const {
    data: { dataViews },
  } = useAiopsAppContext();
  const [fields, setFields] = useState<DataViewField[]>([]);
  const [selectedField, setSelectedField] = useState<DataViewField | null>(null);
  const [isDataViewTimeBased, setIsDataViewTimeBased] = useState(true);

  const randomSampler = useMemo(() => {
    return new RandomSampler({
      randomSamplerMode: formInput.randomSamplerMode ?? RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
      setRandomSamplerMode: () => {},
      randomSamplerProbability: formInput.randomSamplerProbability ?? DEFAULT_PROBABILITY,
      setRandomSamplerProbability: () => {},
    });
  }, [formInput.randomSamplerMode, formInput.randomSamplerProbability]);
  const randomSamplerMode = useObservable(randomSampler.getMode$(), randomSampler.getMode());
  const randomSamplerProbability = useObservable(
    randomSampler.getProbability$(),
    randomSampler.getProbability()
  );

  const isMounted = useMountedState();

  useEffect(
    function initFields() {
      if (!dataViewId) {
        setFields([]);
        setSelectedField(null);
        return;
      }

      dataViews
        .get(dataViewId)
        .then((dataView) => {
          if (!isMounted()) {
            return;
          }
          const isTimeBased = dataView.isTimeBased();
          setIsDataViewTimeBased(isTimeBased);
          if (isTimeBased === false) {
            setFields([]);
            setSelectedField(null);
            return;
          }
          const { dataViewFields, messageField } = getMessageField(dataView);
          setFields(dataViewFields);
          const field = dataViewFields.find((f) => f.name === formInput.fieldName);
          if (formInput.fieldName === undefined) {
            // form input does not contain a field name, select the found message field
            setSelectedField(messageField ?? null);
            return;
          }
          // otherwise, select the field from the form input
          setSelectedField(field ?? messageField ?? null);
        })
        .catch(() => {
          setFields([]);
          setSelectedField(null);
        });
    },
    [dataViewId, dataViews, formInput, isMounted, onChange]
  );

  useEffect(
    function validateForm() {
      onValidationChange(selectedField !== null && formInput.dataViewId !== undefined);
    },
    [selectedField, formInput, onValidationChange]
  );

  useEffect(
    function samplerChange() {
      onChange({
        ...formInput,
        randomSamplerMode,
        randomSamplerProbability,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, randomSamplerMode, randomSamplerProbability]
  );

  useEffect(
    function samplerChange() {
      if (selectedField === null) {
        return;
      }

      onChange({
        ...formInput,
        fieldName: selectedField.name,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, selectedField]
  );

  const setMinimumTimeRangeOption = (option: MinimumTimeRangeOption) => {
    onChange({
      ...formInput,
      minimumTimeRangeOption: option,
    });
  };

  return (
    <>
      <FieldSelector
        fields={fields}
        selectedField={selectedField}
        setSelectedField={setSelectedField}
        WarningComponent={
          isDataViewTimeBased === false
            ? TimeFieldWarning
            : fields.length === 0
            ? TextFieldWarning
            : undefined
        }
      />

      <EuiSpacer />

      <PatternAnalysisSettings
        categoryCount={undefined}
        minimumTimeRangeOption={formInput.minimumTimeRangeOption}
        setMinimumTimeRangeOption={setMinimumTimeRangeOption}
        compressed={true}
      />

      <EuiSpacer />

      <SamplingPanel
        randomSampler={randomSampler}
        reload={() => {}}
        calloutPosition="bottom"
        displayProbability={false}
        compressed={true}
      />
    </>
  );
};

const TextFieldWarning = () => {
  return (
    <>
      <EuiCallOut
        size="s"
        title={i18n.translate(
          'xpack.aiops.logCategorization.embeddableMenu.textFieldWarning.title',
          {
            defaultMessage: 'The selected data view does not contain any text fields.',
          }
        )}
        color="warning"
        iconType="warning"
      >
        <p>
          {i18n.translate(
            'xpack.aiops.logCategorization.embeddableMenu.textFieldWarning.title.description',
            {
              defaultMessage: 'Pattern analysis can only be run on data views with a text field.',
            }
          )}
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
