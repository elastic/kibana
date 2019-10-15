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

import { i18n } from '@kbn/i18n';

import { metadata } from 'ui/metadata';
import { IndexPattern, INDEX_PATTERN_ILLEGAL_CHARACTERS } from 'ui/index_patterns';
import { Field, EVENT_RATE_FIELD_ID } from '../../../../../../common/types/fields';

import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useKibanaContext } from '../../../../../contexts/kibana';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import { JOB_TYPES } from '../../hooks/use_create_analytics_form/state';
import { JOB_ID_MAX_LENGTH } from '../../../../../../common/constants/validation';
import { Messages } from './messages';
import { JobType } from './job_type';

// based on code used by `ui/index_patterns` internally
// remove the space character from the list of illegal characters
INDEX_PATTERN_ILLEGAL_CHARACTERS.pop();
const characterList = INDEX_PATTERN_ILLEGAL_CHARACTERS.join(', ');

const NUMERICAL_FIELD_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
]);

export const CreateAnalyticsForm: FC<CreateAnalyticsFormProps> = ({ actions, state }) => {
  const { setFormState } = actions;
  const kibanaContext = useKibanaContext();

  const {
    form,
    indexPatternsMap,
    indexPatternsWithNumericFields,
    indexPatternTitles,
    isAdvancedEditorEnabled,
    isJobCreated,
    requestMessages,
  } = state;

  const {
    createIndexPattern,
    dependentVariable,
    dependentVariableFetchFail,
    dependentVariableOptions,
    destinationIndex,
    destinationIndexNameEmpty,
    destinationIndexNameExists,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdValid,
    jobIdInvalidMaxLength,
    jobType,
    loadingDepFieldOptions,
    sourceIndex,
    sourceIndexNameEmpty,
    sourceIndexNameValid,
    trainingPercent,
  } = form;

  const loadDependentFieldOptions = async () => {
    setFormState({ loadingDepFieldOptions: true, dependentVariable: '' });
    try {
      const indexPattern: IndexPattern = await kibanaContext.indexPatterns.get(
        indexPatternsMap[sourceIndex]
      );

      if (indexPattern !== undefined) {
        await newJobCapsService.initializeFromIndexPattern(indexPattern);
        // Get fields and filter for numeric
        const { fields } = newJobCapsService;
        const options: Array<{ label: string }> = [];

        fields.forEach((field: Field) => {
          if (NUMERICAL_FIELD_TYPES.has(field.type) && field.id !== EVENT_RATE_FIELD_ID) {
            options.push({ label: field.id });
          }
        });

        setFormState({
          dependentVariableOptions: options,
          loadingDepFieldOptions: false,
          dependentVariableFetchFail: false,
        });
      }
    } catch (e) {
      // TODO: ensure error messages show up correctly
      setFormState({ loadingDepFieldOptions: false, dependentVariableFetchFail: true });
    }
  };

  useEffect(() => {
    if (jobType === JOB_TYPES.REGRESSION && sourceIndexNameEmpty === false) {
      loadDependentFieldOptions();
    }
  }, [sourceIndex, jobType, sourceIndexNameEmpty]);

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
            />
          </EuiFormRow>
          {/* TODO: Does the source index message below apply for regression jobs as well? Same for all validation messages below */}
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexLabel', {
              defaultMessage: 'Source index',
            })}
            helpText={
              !sourceIndexNameEmpty &&
              !indexPatternsWithNumericFields.includes(sourceIndex) &&
              i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexHelpText', {
                defaultMessage:
                  'This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers.',
              })
            }
            isInvalid={!sourceIndexNameEmpty && !sourceIndexNameValid}
            error={
              !sourceIndexNameEmpty &&
              !sourceIndexNameValid && [
                <Fragment>
                  {i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexInvalidError', {
                    defaultMessage:
                      'Invalid source index name, it cannot contain spaces or the characters: {characterList}',
                    values: { characterList },
                  })}
                </Fragment>,
              ]
            }
          >
            <Fragment>
              {!isJobCreated && (
                <EuiComboBox
                  placeholder={i18n.translate(
                    'xpack.ml.dataframe.analytics.create.sourceIndexPlaceholder',
                    {
                      defaultMessage: 'Choose a source index pattern or saved search.',
                    }
                  )}
                  singleSelection={{ asPlainText: true }}
                  options={indexPatternTitles.sort().map(d => ({ label: d }))}
                  selectedOptions={[{ label: sourceIndex }]}
                  onChange={selectedOptions =>
                    setFormState({ sourceIndex: selectedOptions[0].label || '' })
                  }
                  isClearable={false}
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
            />
          </EuiFormRow>
          {jobType === JOB_TYPES.REGRESSION && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.dependentVariableLabel',
                  {
                    defaultMessage: 'Dependent variable',
                  }
                )}
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
                  isLoading={loadingDepFieldOptions}
                  singleSelection={true}
                  options={dependentVariableOptions}
                  selectedOptions={dependentVariable ? [{ label: dependentVariable }] : []}
                  onChange={selectedOptions =>
                    setFormState({ dependentVariable: selectedOptions[0].label || '' })
                  }
                  isClearable={false}
                  isInvalid={dependentVariable === ''}
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
                />
              </EuiFormRow>
            </Fragment>
          )}
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
            />
          </EuiFormRow>
        </Fragment>
      )}
    </EuiForm>
  );
};
