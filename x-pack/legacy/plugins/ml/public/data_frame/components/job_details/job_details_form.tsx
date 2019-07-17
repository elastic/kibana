/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { metadata } from 'ui/metadata';
import { toastNotifications } from 'ui/notify';

import { EuiLink, EuiSwitch, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';

// @ts-ignore
import { isJobIdValid } from '../../../../common/util/job_utils';
import { isValidIndexName } from '../../../../common/util/es_utils';

import { ml } from '../../../services/ml_api_service';

import { DataFrameJobConfig, delayFormatRegex, KibanaContext, isKibanaContext } from '../../common';
import { EsIndexName, IndexPatternTitle, JobId } from './common';

export interface JobDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  isContinuousModeEnabled: boolean;
  jobId: JobId;
  jobDescription: string;
  destinationIndex: EsIndexName;
  touched: boolean;
  valid: boolean;
}

export function getDefaultJobDetailsState(): JobDetailsExposedState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: '60s',
    createIndexPattern: true,
    isContinuousModeEnabled: false,
    jobId: '',
    jobDescription: '',
    destinationIndex: '',
    touched: false,
    valid: false,
  };
}

interface Props {
  overrides?: JobDetailsExposedState;
  onChange(s: JobDetailsExposedState): void;
}

export const JobDetailsForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const defaults = { ...getDefaultJobDetailsState(), ...overrides };

  const [jobId, setJobId] = useState<JobId>(defaults.jobId);
  const [jobDescription, setJobDescription] = useState<string>(defaults.jobDescription);
  const [destinationIndex, setDestinationIndex] = useState<EsIndexName>(defaults.destinationIndex);
  const [jobIds, setJobIds] = useState<JobId[]>([]);
  const [indexNames, setIndexNames] = useState<EsIndexName[]>([]);
  const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternTitle[]>([]);
  const [createIndexPattern, setCreateIndexPattern] = useState(defaults.createIndexPattern);

  // Continuous mode state
  const [isContinuousModeEnabled, setContinuousModeEnabled] = useState(
    defaults.isContinuousModeEnabled
  );
  const dateFieldNames = kibanaContext.currentIndexPattern.fields
    .filter(f => f.type === 'date')
    .map(f => f.name)
    .sort();
  const isContinuousModeAvailable = dateFieldNames.length > 0;
  const [continuousModeDateField, setContinuousModeDateField] = useState(
    isContinuousModeAvailable ? dateFieldNames[0] : ''
  );
  const [continuousModeDelay, setContinuousModeDelay] = useState(defaults.continuousModeDelay);
  const isContinuousModeDelayValid = continuousModeDelay.match(delayFormatRegex) !== null;

  // fetch existing job IDs and indices once for form validation
  useEffect(() => {
    // use an IIFE to avoid returning a Promise to useEffect.
    (async function() {
      try {
        setJobIds(
          (await ml.dataFrame.getDataFrameTransforms()).transforms.map(
            (job: DataFrameJobConfig) => job.id
          )
        );
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.jobDetailsForm.errorGettingDataFrameJobsList', {
            defaultMessage:
              'An error occurred getting the existing data frame transform Ids: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }

      try {
        setIndexNames((await ml.getIndices()).map(index => index.name));
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.jobDetailsForm.errorGettingDataFrameIndexNames', {
            defaultMessage: 'An error occurred getting the existing index names: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }

      try {
        setIndexPatternTitles(await kibanaContext.indexPatterns.getTitles());
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.jobDetailsForm.errorGettingIndexPatternTitles', {
            defaultMessage: 'An error occurred getting the existing index pattern titles: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }
    })();
  }, []);

  const jobIdExists = jobIds.some(id => jobId === id);
  const jobIdEmpty = jobId === '';
  const jobIdValid = isJobIdValid(jobId);

  const indexNameExists = indexNames.some(name => destinationIndex === name);
  const indexNameEmpty = destinationIndex === '';
  const indexNameValid = isValidIndexName(destinationIndex);
  const indexPatternTitleExists = indexPatternTitles.some(name => destinationIndex === name);

  const valid =
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !indexNameEmpty &&
    indexNameValid &&
    (!indexPatternTitleExists || !createIndexPattern) &&
    (!isContinuousModeAvailable || (isContinuousModeAvailable && isContinuousModeDelayValid));

  // expose state to wizard
  useEffect(() => {
    onChange({
      continuousModeDateField,
      continuousModeDelay,
      createIndexPattern,
      isContinuousModeEnabled,
      jobId,
      jobDescription,
      destinationIndex,
      touched: true,
      valid,
    });
  }, [
    continuousModeDateField,
    continuousModeDelay,
    createIndexPattern,
    isContinuousModeEnabled,
    jobId,
    jobDescription,
    destinationIndex,
    valid,
  ]);

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdLabel', {
          defaultMessage: 'Transform id',
        })}
        isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
        error={[
          ...(!jobIdEmpty && !jobIdValid
            ? [
                i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdInvalidError', {
                  defaultMessage:
                    'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                }),
              ]
            : []),
          ...(jobIdExists
            ? [
                i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdExistsError', {
                  defaultMessage: 'A transform with this id already exists.',
                }),
              ]
            : []),
        ]}
      >
        <EuiFieldText
          placeholder="transform id"
          value={jobId}
          onChange={e => setJobId(e.target.value)}
          aria-label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdInputAriaLabel', {
            defaultMessage: 'Choose a unique transform id.',
          })}
          isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobDescriptionLabel', {
          defaultMessage: 'Transform description',
        })}
        helpText={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobDescriptionHelpText', {
          defaultMessage: 'Optional descriptive text.',
        })}
      >
        <EuiFieldText
          placeholder="transform description"
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.jobDetailsForm.jobDescriptionInputAriaLabel',
            {
              defaultMessage: 'Choose an optional transform description.',
            }
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
        isInvalid={!indexNameEmpty && !indexNameValid}
        helpText={
          indexNameExists &&
          i18n.translate('xpack.ml.dataframe.jobDetailsForm.destinationIndexHelpText', {
            defaultMessage:
              'An index with this name already exists. Be aware that running this transform will modify this destination index.',
          })
        }
        error={
          !indexNameEmpty &&
          !indexNameValid && [
            <Fragment>
              {i18n.translate('xpack.ml.dataframe.jobDetailsForm.destinationIndexInvalidError', {
                defaultMessage: 'Invalid destination index name.',
              })}
              <br />
              <EuiLink
                href={`https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/indices-create-index.html#indices-create-index`}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.ml.dataframe.definePivotForm.destinationIndexInvalidErrorLink',
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
          placeholder="destination index"
          value={destinationIndex}
          onChange={e => setDestinationIndex(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.jobDetailsForm.destinationIndexInputAriaLabel',
            {
              defaultMessage: 'Choose a unique destination index name.',
            }
          )}
          isInvalid={!indexNameEmpty && !indexNameValid}
        />
      </EuiFormRow>
      <EuiFormRow
        isInvalid={createIndexPattern && indexPatternTitleExists}
        error={
          createIndexPattern &&
          indexPatternTitleExists && [
            i18n.translate('xpack.ml.dataframe.jobDetailsForm.indexPatternTitleError', {
              defaultMessage: 'An index pattern with this title already exists.',
            }),
          ]
        }
      >
        <EuiSwitch
          name="mlDataFrameCreateIndexPattern"
          label={i18n.translate('xpack.ml.dataframe.jobCreateForm.createIndexPatternLabel', {
            defaultMessage: 'Create index pattern',
          })}
          checked={createIndexPattern === true}
          onChange={() => setCreateIndexPattern(!createIndexPattern)}
        />
      </EuiFormRow>
      <EuiFormRow
        helpText={
          isContinuousModeAvailable === false
            ? i18n.translate('xpack.ml.dataframe.jobDetailsForm.continuousModeError', {
                defaultMessage: 'Continuous mode is not available for indices without date fields.',
              })
            : ''
        }
      >
        <EuiSwitch
          name="mlDataFrameContinuousMode"
          label={i18n.translate('xpack.ml.dataframe.jobCreateForm.continuousModeLabel', {
            defaultMessage: 'Continuous mode',
          })}
          checked={isContinuousModeEnabled === true}
          onChange={() => setContinuousModeEnabled(!isContinuousModeEnabled)}
          disabled={isContinuousModeAvailable === false}
        />
      </EuiFormRow>
      {isContinuousModeEnabled && (
        <Fragment>
          <EuiFormRow
            label={i18n.translate(
              'xpack.ml.dataframe.jobDetailsForm.continuousModeDateFieldLabel',
              {
                defaultMessage: 'Date field',
              }
            )}
            helpText={i18n.translate(
              'xpack.ml.dataframe.jobDetailsForm.continuousModeDateFieldHelpText',
              {
                defaultMessage: 'Select the date field that can be used to identify new documents.',
              }
            )}
          >
            <EuiSelect
              options={dateFieldNames.map(text => ({ text }))}
              value={continuousModeDateField}
              onChange={e => setContinuousModeDateField(e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.continuousModeDelayLabel', {
              defaultMessage: 'Delay',
            })}
            isInvalid={!isContinuousModeDelayValid}
            error={
              !isContinuousModeDelayValid && [
                i18n.translate('xpack.ml.dataframe.jobDetailsForm.continuousModeDelayError', {
                  defaultMessage: 'Invalid delay format',
                }),
              ]
            }
            helpText={i18n.translate(
              'xpack.ml.dataframe.jobDetailsForm.continuousModeDelayHelpText',
              {
                defaultMessage: 'Time delay between current time and latest input data time.',
              }
            )}
          >
            <EuiFieldText
              placeholder="delay"
              value={continuousModeDelay}
              onChange={e => setContinuousModeDelay(e.target.value)}
              aria-label={i18n.translate(
                'xpack.ml.dataframe.jobDetailsForm.continuousModeAriaLabel',
                {
                  defaultMessage: 'Choose a delay.',
                }
              )}
              isInvalid={!isContinuousModeDelayValid}
            />
          </EuiFormRow>
        </Fragment>
      )}
    </EuiForm>
  );
});
