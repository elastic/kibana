/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, Fragment, FC, SetStateAction } from 'react';

import { EuiComboBox, EuiForm, EuiFieldText, EuiFormRow, EuiLink, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { metadata } from 'ui/metadata';

interface CreateAnalyticsFormProps {
  createIndexPattern: boolean;
  destinationIndex: string;
  destinationIndexNameEmpty: boolean;
  destinationIndexNameExists: boolean;
  destinationIndexNameValid: boolean;
  destinationIndexPatternTitleExists: boolean;
  indexPatternTitles: string[];
  indexPatternTitlesWithNumericFields: string[];
  isJobCreated: boolean;
  jobId: string;
  jobIdEmpty: boolean;
  jobIdValid: boolean;
  jobIdExists: boolean;
  setCreateIndexPattern: Dispatch<SetStateAction<boolean>>;
  setDestinationIndex: Dispatch<SetStateAction<string>>;
  setJobId: Dispatch<SetStateAction<string>>;
  setSourceIndex: Dispatch<SetStateAction<string>>;
  sourceIndex: string;
  sourceIndexNameEmpty: boolean;
  sourceIndexNameExists: boolean;
  sourceIndexNameValid: boolean;
}

export const CreateAnalyticsForm: FC<CreateAnalyticsFormProps> = ({
  createIndexPattern,
  destinationIndex,
  destinationIndexNameEmpty,
  destinationIndexNameExists,
  destinationIndexNameValid,
  destinationIndexPatternTitleExists,
  indexPatternTitles,
  indexPatternTitlesWithNumericFields,
  isJobCreated,
  jobId,
  jobIdEmpty,
  jobIdValid,
  jobIdExists,
  setCreateIndexPattern,
  setDestinationIndex,
  setJobId,
  setSourceIndex,
  sourceIndex,
  sourceIndexNameEmpty,
  sourceIndexNameExists,
  sourceIndexNameValid,
}) => (
  <EuiForm>
    <EuiFormRow
      label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdLabel', {
        defaultMessage: 'Analytics job id',
      })}
      isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
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
                defaultMessage: 'An analytics job with this id already exists.',
              }),
            ]
          : []),
      ]}
    >
      <EuiFieldText
        disabled={isJobCreated}
        placeholder="analytics job id"
        value={jobId}
        onChange={e => setJobId(e.target.value)}
        aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdInputAriaLabel', {
          defaultMessage: 'Choose a unique analytics job id.',
        })}
        isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
      />
    </EuiFormRow>

    <EuiFormRow
      label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexLabel', {
        defaultMessage: 'Source index',
      })}
      helpText={
        !sourceIndexNameEmpty &&
        !indexPatternTitlesWithNumericFields.includes(sourceIndex) &&
        i18n.translate('xpack.ml.dataframe.stepDetailsForm.sourceIndexHelpText', {
          defaultMessage:
            'This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers.',
        })
      }
      isInvalid={!sourceIndexNameEmpty && (!sourceIndexNameValid || !sourceIndexNameExists)}
      error={
        (!sourceIndexNameEmpty &&
          !sourceIndexNameValid && [
            <Fragment>
              {i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexInvalidError', {
                defaultMessage: 'Invalid source index name.',
              })}
              <br />
              <EuiLink
                href={`https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/indices-create-index.html#indices-create-index`}
                target="_blank"
              >
                {i18n.translate('xpack.ml.dataframe.stepDetailsForm.sourceIndexInvalidErrorLink', {
                  defaultMessage: 'Learn more about index name limitations.',
                })}
              </EuiLink>
            </Fragment>,
          ]) ||
        (!sourceIndexNameEmpty &&
          !sourceIndexNameExists && [
            <Fragment>
              {i18n.translate('xpack.ml.dataframe.analytics.create.sourceIndexDoesNotExistError', {
                defaultMessage: 'An index with this name does not exist.',
              })}
            </Fragment>,
          ])
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
            onChange={selectedOptions => setSourceIndex(selectedOptions[0].label || '')}
            isClearable={false}
          />
        )}
        {isJobCreated && (
          <EuiFieldText
            disabled={true}
            value={sourceIndex}
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.jobIdInputAriaLabel', {
              defaultMessage: 'Source index pattern or search.',
            })}
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
            {i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexInvalidError', {
              defaultMessage: 'Invalid destination index name.',
            })}
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
        onChange={e => setDestinationIndex(e.target.value)}
        aria-label={i18n.translate(
          'xpack.ml.dataframe.analytics.create.destinationIndexInputAriaLabel',
          {
            defaultMessage: 'Choose a unique destination index name.',
          }
        )}
        isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
      />
    </EuiFormRow>

    <EuiFormRow
      isInvalid={createIndexPattern && destinationIndexPatternTitleExists}
      error={
        createIndexPattern &&
        destinationIndexPatternTitleExists && [
          i18n.translate('xpack.ml.dataframe.analytics.create.indexPatternTitleError', {
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
        onChange={() => setCreateIndexPattern(!createIndexPattern)}
      />
    </EuiFormRow>
  </EuiForm>
);
