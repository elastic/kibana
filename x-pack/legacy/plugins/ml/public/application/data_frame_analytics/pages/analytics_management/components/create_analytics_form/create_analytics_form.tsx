/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect } from 'react';

import {
  EuiComboBox,
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiRange,
  EuiSwitch,
} from '@elastic/eui';
import { debounce } from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { metadata } from 'ui/metadata';
import { IndexPattern, INDEX_PATTERN_ILLEGAL_CHARACTERS } from 'ui/index_patterns';
import { ES_FIELD_TYPES } from '../../../../../../../../../../../src/plugins/data/public';
import { ml } from '../../../../../services/ml_api_service';
import { Field, EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';

import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useKibanaContext } from '../../../../../contexts/kibana';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import {
  JOB_TYPES,
  DEFAULT_MODEL_MEMORY_LIMIT,
  getJobConfigFromFormState,
  Option,
} from '../../hooks/use_create_analytics_form/state';
import { JOB_ID_MAX_LENGTH } from '../../../../../../../common/constants/validation';
import { Messages } from './messages';
import { JobType } from './job_type';
import { JobDescriptionInput } from './job_description';
import { mmlUnitInvalidErrorMessage } from '../../hooks/use_create_analytics_form/reducer';
import {
  IndexPattern,
  indexPatterns,
} from '../../../../../../../../../../../src/plugins/data/public';

const NUMERICAL_FIELD_TYPES = new Set([
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
]);

const SUPPORTED_ANALYSIS_FIELD_TYPES = new Set([
  ES_FIELD_TYPES.BOOLEAN,
  ES_FIELD_TYPES.TEXT,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
]);

// List of system fields we want to ignore for the numeric field check.
const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

export const CreateAnalyticsForm: FC<CreateAnalyticsFormProps> = ({ actions, state }) => {
  const { setFormState } = actions;
  const kibanaContext = useKibanaContext();
  const { form, indexPatternsMap, isAdvancedEditorEnabled, isJobCreated, requestMessages } = state;

  const {
    createIndexPattern,
    dependentVariable,
    dependentVariableFetchFail,
    dependentVariableOptions,
    description,
    destinationIndex,
    destinationIndexNameEmpty,
    destinationIndexNameExists,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    excludes,
    excludesOptions,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdValid,
    jobIdInvalidMaxLength,
    jobType,
    loadingFieldOptions,
    modelMemoryLimit,
    modelMemoryLimitUnitValid,
    sourceIndex,
    sourceIndexNameEmpty,
    sourceIndexNameValid,
    sourceIndexContainsNumericalFields,
    sourceIndexFieldsCheckFailed,
    trainingPercent,
  } = form;
  const characterList = indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.join(', ');

  // Find out if index pattern contain numeric fields. Provides a hint in the form
  // that an analytics jobs is not able to identify outliers if there are no numeric fields present.
  const validateSourceIndexFields = async () => {
    try {
      const indexPattern: IndexPattern = await kibanaContext.indexPatterns.get(
        indexPatternsMap[sourceIndex].value
      );
      const containsNumericalFields: boolean = indexPattern.fields.some(
        ({ name, type }) => !OMIT_FIELDS.includes(name) && type === 'number'
      );

      setFormState({
        sourceIndexContainsNumericalFields: containsNumericalFields,
        sourceIndexFieldsCheckFailed: false,
      });
    } catch (e) {
      setFormState({
        sourceIndexFieldsCheckFailed: true,
      });
    }
  };

  // Regression and Classification support numeric, boolean, text, keyword, and ip types
  // Outlier detection supports numeric or boolean types
  const shouldAddAsAnalyzedFieldsOption = (field: Field) => {
    if (field.id === EVENT_RATE_FIELD_ID) return false;

    const isNumerical = NUMERICAL_FIELD_TYPES.has(field.type);

    if (jobType === JOB_TYPES.OUTLIER_DETECTION)
      return isNumerical || field.type === ES_FIELD_TYPES.BOOLEAN;
    if (jobType === JOB_TYPES.REGRESSION || jobType === JOB_TYPES.CLASSIFICATION)
      return isNumerical || SUPPORTED_ANALYSIS_FIELD_TYPES.has(field.type);
  };

  // Regression supports numeric fields. Classification supports numeric and boolean.
  const shouldAddAsDepVarOption = (field: Field) => {
    if (field.id === EVENT_RATE_FIELD_ID) return false;

    const isNumerical = NUMERICAL_FIELD_TYPES.has(field.type);
    const isSupportedByClassification = isNumerical || field.type === ES_FIELD_TYPES.BOOLEAN;

    if (jobType === JOB_TYPES.REGRESSION) return isNumerical;
    if (jobType === JOB_TYPES.CLASSIFICATION) return isSupportedByClassification;
  };

  const onCreateOption = (searchValue: string, flattenedOptions: Option[]) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Create the option if it doesn't exist.
    if (
      flattenedOptions.findIndex(
        (option: { label: string }) => option.label.trim().toLowerCase() === normalizedSearchValue
      ) === -1
    ) {
      excludesOptions.push(newOption);
      setFormState({ excludes: [...excludes, newOption.label] });
    }
  };

  const debouncedMmlEstimateLoad = debounce(async () => {
    try {
      const jobConfig = getJobConfigFromFormState(form);
      delete jobConfig.dest;
      delete jobConfig.model_memory_limit;
      const resp = await ml.dataFrameAnalytics.explainDataFrameAnalytics(jobConfig);
      setFormState({
        modelMemoryLimit: resp.memory_estimation?.expected_memory_without_disk,
      });
    } catch (e) {
      setFormState({
        modelMemoryLimit:
          jobType !== undefined
            ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
            : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection,
      });
    }
  }, 500);

  const loadFieldOptions = async () => {
    setFormState({
      loadingFieldOptions: true,
      // clear when the source index changes
      dependentVariable: '',
      excludes: [],
      // Reset outlier detection sourceIndex checks to default values if we've switched to regression
      sourceIndexFieldsCheckFailed: false,
      sourceIndexContainsNumericalFields: true,
    });
    try {
      const indexPattern: IndexPattern = await kibanaContext.indexPatterns.get(
        indexPatternsMap[sourceIndex].value
      );
      const shouldPrepDepVarOptions =
        jobType === JOB_TYPES.REGRESSION || jobType === JOB_TYPES.CLASSIFICATION;

      if (indexPattern !== undefined) {
        await newJobCapsService.initializeFromIndexPattern(indexPattern);
        // Get fields and filter for supported types for job type
        const { fields } = newJobCapsService;

        const depVarOptions: Array<{ label: string }> = [];
        const analyzedFieldsOptions: Array<{ label: string }> = [];

        fields.forEach((field: Field) => {
          if (shouldPrepDepVarOptions && shouldAddAsDepVarOption(field)) {
            depVarOptions.push({ label: field.id });
          }
          if (shouldAddAsAnalyzedFieldsOption(field)) {
            analyzedFieldsOptions.push({ label: field.id });
          }
        });

        if (shouldPrepDepVarOptions) {
          setFormState({
            dependentVariableOptions: depVarOptions,
            excludesOptions: analyzedFieldsOptions,
            loadingFieldOptions: false,
            dependentVariableFetchFail: false,
          });
        } else {
          setFormState({
            excludesOptions: analyzedFieldsOptions,
            loadingFieldOptions: false,
            dependentVariableFetchFail: false,
          });
        }
      }
    } catch (e) {
      setFormState({ loadingFieldOptions: false, dependentVariableFetchFail: true });
    }
  };

  const getSourceIndexErrorMessages = () => {
    const errors = [];
    if (!sourceIndexNameEmpty && !sourceIndexNameValid) {
      errors.push(
        <Fragment>
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.create.sourceIndexInvalidError"
            defaultMessage="Invalid source index name, it cannot contain spaces or the characters: {characterList}"
            values={{ characterList }}
          />
        </Fragment>
      );
    }

    if (sourceIndexFieldsCheckFailed === true) {
      errors.push(
        <Fragment>
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.create.sourceIndexFieldCheckError"
            defaultMessage="There was a problem checking for numerical fields. Please refresh the page and try again."
          />
        </Fragment>
      );
    }

    return errors;
  };

  useEffect(() => {
    if (jobType !== undefined && sourceIndexNameEmpty === false) {
      loadFieldOptions();
    }
    if (jobType === JOB_TYPES.OUTLIER_DETECTION && sourceIndexNameEmpty === false) {
      validateSourceIndexFields();
    }
  }, [sourceIndex, jobType, sourceIndexNameEmpty]);

  useEffect(() => {
    const hasBasicRequiredFields =
      jobType !== undefined && sourceIndex !== '' && sourceIndexNameValid === true;
    const jobTypesWithDepVar =
      jobType === JOB_TYPES.REGRESSION || jobType === JOB_TYPES.CLASSIFICATION;

    const hasRequiredAnalysisFields =
      (jobTypesWithDepVar && dependentVariable !== '' && trainingPercent !== undefined) ||
      jobType === JOB_TYPES.OUTLIER_DETECTION;

    if (hasBasicRequiredFields && hasRequiredAnalysisFields) {
      debouncedMmlEstimateLoad();
    }

    return () => {
      debouncedMmlEstimateLoad.cancel();
    };
  }, [jobType, sourceIndex, dependentVariable, trainingPercent]);

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      <Messages messages={requestMessages} />
      {!isJobCreated && (
        <Fragment>
          <JobType type={jobType} setFormState={setFormState} />
          <EuiFormRow
            helpText={i18n.translate(
              'xpack.ml.dataframe.analytics.create.enableAdvancedEditorHelpText',
              {
                defaultMessage: 'You cannot switch back to this form from the advanced editor.',
              }
            )}
          >
            <EuiSwitch
              disabled={jobType === undefined}
              compressed={true}
              name="mlDataFrameAnalyticsEnableAdvancedEditor"
              label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.enableAdvancedEditorSwitch',
                {
                  defaultMessage: 'Enable advanced editor',
                }
              )}
              checked={isAdvancedEditorEnabled}
              onChange={actions.switchToAdvancedEditor}
              data-test-subj="mlAnalyticsCreateJobFlyoutAdvancedEditorSwitch"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdLabel', {
              defaultMessage: 'Job ID',
            })}
            isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists || jobIdInvalidMaxLength}
            error={[
              ...(!jobIdEmpty && !jobIdValid
                ? [
                    i18n.translate('xpack.ml.dataframe.analytics.create.jobIdInvalidError', {
                      defaultMessage:
                        'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                    }),
                  ]
                : []),
              ...(jobIdExists
                ? [
                    i18n.translate('xpack.ml.dataframe.analytics.create.jobIdExistsError', {
                      defaultMessage: 'An analytics job with this ID already exists.',
                    }),
                  ]
                : []),
              ...(jobIdInvalidMaxLength
                ? [
                    i18n.translate(
                      'xpack.ml.dataframe.analytics.create.jobIdInvalidMaxLengthErrorMessage',
                      {
                        defaultMessage:
                          'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
                        values: {
                          maxLength: JOB_ID_MAX_LENGTH,
                        },
                      }
                    ),
                  ]
                : []),
            ]}
          >
            <EuiFieldText
              disabled={isJobCreated}
              placeholder={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdPlaceholder', {
                defaultMessage: 'Job ID',
              })}
              value={jobId}
              onChange={e => setFormState({ jobId: e.target.value })}
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.jobIdInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique analytics job ID.',
                }
              )}
              isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
              data-test-subj="mlAnalyticsCreateJobFlyoutJobIdInput"
            />
          </EuiFormRow>
          <JobDescriptionInput description={description} setFormState={setFormState} />
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexLabel', {
              defaultMessage: 'Source index',
            })}
            helpText={
              !sourceIndexNameEmpty &&
              !sourceIndexContainsNumericalFields &&
              i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexHelpText', {
                defaultMessage:
                  'This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers.',
              })
            }
            isInvalid={!sourceIndexNameEmpty && !sourceIndexNameValid}
            error={getSourceIndexErrorMessages()}
          >
            <Fragment>
              {!isJobCreated && (
                <EuiComboBox
                  placeholder={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.sourceIndexPlaceholder',
                    {
                      defaultMessage: 'Choose a source index pattern.',
                    }
                  )}
                  singleSelection={{ asPlainText: true }}
                  options={Object.values(indexPatternsMap).sort((a, b) =>
                    a.label.localeCompare(b.label)
                  )}
                  selectedOptions={
                    indexPatternsMap[sourceIndex] !== undefined ? [{ label: sourceIndex }] : []
                  }
                  onChange={selectedOptions =>
                    setFormState({ sourceIndex: selectedOptions[0].label || '' })
                  }
                  isClearable={false}
                  data-test-subj="mlAnalyticsCreateJobFlyoutSourceIndexSelect"
                />
              )}
              {isJobCreated && (
                <EuiFieldText
                  disabled={true}
                  value={sourceIndex}
                  aria-label={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.sourceIndexInputAriaLabel',
                    {
                      defaultMessage: 'Source index pattern or search.',
                    }
                  )}
                />
              )}
            </Fragment>
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexLabel', {
              defaultMessage: 'Destination index',
            })}
            isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
            helpText={
              destinationIndexNameExists &&
              i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexHelpText', {
                defaultMessage:
                  'An index with this name already exists. Be aware that running this analytics job will modify this destination index.',
              })
            }
            error={
              !destinationIndexNameEmpty &&
              !destinationIndexNameValid && [
                <Fragment>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.create.destinationIndexInvalidError',
                    {
                      defaultMessage: 'Invalid destination index name.',
                    }
                  )}
                  <br />
                  <EuiLink
                    href={`https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/indices-create-index.html#indices-create-index`}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.ml.dataframe.stepDetailsForm.destinationIndexInvalidErrorLink',
                      {
                        defaultMessage: 'Learn more about index name limitations.',
                      }
                    )}
                  </EuiLink>
                </Fragment>,
              ]
            }
          >
            <EuiFieldText
              disabled={isJobCreated}
              placeholder="destination index"
              value={destinationIndex}
              onChange={e => setFormState({ destinationIndex: e.target.value })}
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.destinationIndexInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique destination index name.',
                }
              )}
              isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
              data-test-subj="mlAnalyticsCreateJobFlyoutDestinationIndexInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.excludedFieldsLabel', {
              defaultMessage: 'Excluded fields',
            })}
            helpText={i18n.translate('xpack.ml.dataframe.analytics.create.excludedFieldsHelpText', {
              defaultMessage:
                'Optionally select fields to be excluded from analysis. All other supported fields will be included',
            })}
          >
            <EuiComboBox
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.excludesInputAriaLabel',
                {
                  defaultMessage: 'Optional. Enter or select field to be excluded.',
                }
              )}
              isDisabled={isJobCreated}
              isLoading={loadingFieldOptions}
              options={excludesOptions}
              selectedOptions={excludes.map(field => ({
                label: field,
              }))}
              onCreateOption={onCreateOption}
              onChange={selectedOptions =>
                setFormState({ excludes: selectedOptions.map(option => option.label) })
              }
              isClearable={true}
              data-test-subj="mlAnalyticsCreateJobFlyoutExcludesSelect"
            />
          </EuiFormRow>
          {(jobType === JOB_TYPES.REGRESSION || jobType === JOB_TYPES.CLASSIFICATION) && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.dependentVariableLabel',
                  {
                    defaultMessage: 'Dependent variable',
                  }
                )}
                helpText={
                  dependentVariableOptions.length === 0 &&
                  dependentVariableFetchFail === false &&
                  !sourceIndexNameEmpty &&
                  i18n.translate(
                    'xpack.ml.dataframe.analytics.create.dependentVariableOptionsNoNumericalFields',
                    {
                      defaultMessage: 'No numeric type fields were found for this index pattern.',
                    }
                  )
                }
                error={
                  dependentVariableFetchFail === true && [
                    <Fragment>
                      {i18n.translate(
                        'xpack.ml.dataframe.analytics.create.dependentVariableOptionsFetchError',
                        {
                          defaultMessage:
                            'There was a problem fetching fields. Please refresh the page and try again.',
                        }
                      )}
                    </Fragment>,
                  ]
                }
              >
                <EuiComboBox
                  aria-label={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.dependentVariableInputAriaLabel',
                    {
                      defaultMessage: 'Enter field to be used as dependent variable.',
                    }
                  )}
                  placeholder={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.dependentVariablePlaceholder',
                    {
                      defaultMessage: 'dependent variable',
                    }
                  )}
                  isDisabled={isJobCreated}
                  isLoading={loadingFieldOptions}
                  singleSelection={true}
                  options={dependentVariableOptions}
                  selectedOptions={dependentVariable ? [{ label: dependentVariable }] : []}
                  onChange={selectedOptions =>
                    setFormState({ dependentVariable: selectedOptions[0].label || '' })
                  }
                  isClearable={false}
                  isInvalid={dependentVariable === ''}
                  data-test-subj="mlAnalyticsCreateJobFlyoutDependentVariableSelect"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.analytics.create.trainingPercentLabel', {
                  defaultMessage: 'Training percent',
                })}
              >
                <EuiRange
                  min={0}
                  max={100}
                  step={1}
                  showLabels
                  showRange
                  showValue
                  value={trainingPercent}
                  // @ts-ignore Property 'value' does not exist on type 'EventTarget' | (EventTarget & HTMLInputElement)
                  onChange={e => setFormState({ trainingPercent: e.target.value })}
                  data-test-subj="mlAnalyticsCreateJobFlyoutTrainingPercentSlider"
                />
              </EuiFormRow>
            </Fragment>
          )}
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryLimitLabel', {
              defaultMessage: 'Model memory limit',
            })}
            helpText={!modelMemoryLimitUnitValid && mmlUnitInvalidErrorMessage}
          >
            <EuiFieldText
              placeholder={
                jobType !== undefined
                  ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
                  : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection
              }
              disabled={isJobCreated}
              value={modelMemoryLimit || ''}
              onChange={e => setFormState({ modelMemoryLimit: e.target.value })}
              isInvalid={modelMemoryLimit === ''}
              data-test-subj="mlAnalyticsCreateJobFlyoutModelMemoryInput"
            />
          </EuiFormRow>
          <EuiFormRow
            isInvalid={createIndexPattern && destinationIndexPatternTitleExists}
            error={
              createIndexPattern &&
              destinationIndexPatternTitleExists && [
                i18n.translate('xpack.ml.dataframe.analytics.create.indexPatternExistsError', {
                  defaultMessage: 'An index pattern with this title already exists.',
                }),
              ]
            }
          >
            <EuiSwitch
              disabled={isJobCreated}
              name="mlDataFrameAnalyticsCreateIndexPattern"
              label={i18n.translate('xpack.ml.dataframe.analytics.create.createIndexPatternLabel', {
                defaultMessage: 'Create index pattern',
              })}
              checked={createIndexPattern === true}
              onChange={() => setFormState({ createIndexPattern: !createIndexPattern })}
              data-test-subj="mlAnalyticsCreateJobFlyoutCreateIndexPatternSwitch"
            />
          </EuiFormRow>
        </Fragment>
      )}
    </EuiForm>
  );
};
