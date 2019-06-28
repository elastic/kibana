/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import { EuiSwitch, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { DataFrameJobConfig, delayFormatRegex, KibanaContext, isKibanaContext } from '../../common';
import { EsIndexName, IndexPatternTitle, JobId } from './common';

export interface JobDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  isContinuousModeEnabled: boolean;
  jobId: JobId;
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
            defaultMessage: 'An error occurred getting the existing data frame job Ids: {error}',
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
  const indexNameExists = indexNames.some(name => destinationIndex === name);
  const indexPatternTitleExists = indexPatternTitles.some(name => destinationIndex === name);
  const valid =
    jobId !== '' &&
    destinationIndex !== '' &&
    !jobIdExists &&
    !indexNameExists &&
    (!indexPatternTitleExists || !createIndexPattern) &&
    (!isContinuousModeAvailable || (isContinuousModeAvailable && isContinuousModeDelayValid));

  // expose state to wizard
  useEffect(
    () => {
      onChange({
        continuousModeDateField,
        continuousModeDelay,
        createIndexPattern,
        isContinuousModeEnabled,
        jobId,
        destinationIndex,
        touched: true,
        valid,
      });
    },
    [
      continuousModeDateField,
      continuousModeDelay,
      createIndexPattern,
      isContinuousModeEnabled,
      jobId,
      destinationIndex,
      valid,
    ]
  );

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdLabel', {
          defaultMessage: 'Job id',
        })}
        isInvalid={jobIdExists}
        error={
          jobIdExists && [
            i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdError', {
              defaultMessage: 'A job with this id already exists.',
            }),
          ]
        }
      >
        <EuiFieldText
          placeholder="job id"
          value={jobId}
          onChange={e => setJobId(e.target.value)}
          aria-label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdInputAriaLabel', {
            defaultMessage: 'Choose a unique job id.',
          })}
          isInvalid={jobIdExists}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
        isInvalid={indexNameExists}
        error={
          indexNameExists && [
            i18n.translate('xpack.ml.dataframe.jobDetailsForm.destinationIndexError', {
              defaultMessage: 'An index with this name already exists.',
            }),
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
          isInvalid={indexNameExists}
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
                defaultMessage:
                  'Pick a date field for the time based continuous data frame transform that reflects ingestion time.',
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
