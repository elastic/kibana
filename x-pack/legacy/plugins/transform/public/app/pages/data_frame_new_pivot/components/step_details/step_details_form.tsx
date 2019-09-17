/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { metadata } from 'ui/metadata';
import { toastNotifications } from 'ui/notify';

import { EuiLink, EuiSwitch, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';

import { useKibanaContext } from '../../../../../contexts/kibana';
import { isValidIndexName } from '../../../../../../common/util/es_utils';

import { ml } from '../../../../../services/ml_api_service';

import {
  isTransformIdValid,
  DataFrameTransformId,
  DataFrameTransformPivotConfig,
} from '../../../../common';
import { EsIndexName, IndexPatternTitle } from './common';
import { delayValidator } from '../../../../common/validators';

export interface StepDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  destinationIndex: EsIndexName;
  isContinuousModeEnabled: boolean;
  touched: boolean;
  transformId: DataFrameTransformId;
  transformDescription: string;
  valid: boolean;
}

export function getDefaultStepDetailsState(): StepDetailsExposedState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: '60s',
    createIndexPattern: true,
    isContinuousModeEnabled: false,
    transformId: '',
    transformDescription: '',
    destinationIndex: '',
    touched: false,
    valid: false,
  };
}

interface Props {
  overrides?: StepDetailsExposedState;
  onChange(s: StepDetailsExposedState): void;
}

export const StepDetailsForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const kibanaContext = useKibanaContext();

  const defaults = { ...getDefaultStepDetailsState(), ...overrides };

  const [transformId, setTransformId] = useState<DataFrameTransformId>(defaults.transformId);
  const [transformDescription, setTransformDescription] = useState<string>(
    defaults.transformDescription
  );
  const [destinationIndex, setDestinationIndex] = useState<EsIndexName>(defaults.destinationIndex);
  const [transformIds, setTransformIds] = useState<DataFrameTransformId[]>([]);
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
  const isContinuousModeDelayValid = delayValidator(continuousModeDelay);

  // fetch existing transform IDs and indices once for form validation
  useEffect(() => {
    // use an IIFE to avoid returning a Promise to useEffect.
    (async function() {
      try {
        setTransformIds(
          (await ml.dataFrame.getDataFrameTransforms()).transforms.map(
            (transform: DataFrameTransformPivotConfig) => transform.id
          )
        );
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.stepDetailsForm.errorGettingDataFrameTransformList', {
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
          i18n.translate('xpack.ml.dataframe.stepDetailsForm.errorGettingDataFrameIndexNames', {
            defaultMessage: 'An error occurred getting the existing index names: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }

      try {
        setIndexPatternTitles(await kibanaContext.indexPatterns.getTitles());
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.stepDetailsForm.errorGettingIndexPatternTitles', {
            defaultMessage: 'An error occurred getting the existing index pattern titles: {error}',
            values: { error: JSON.stringify(e) },
          })
        );
      }
    })();
  }, []);

  const transformIdExists = transformIds.some(id => transformId === id);
  const transformIdEmpty = transformId === '';
  const transformIdValid = isTransformIdValid(transformId);

  const indexNameExists = indexNames.some(name => destinationIndex === name);
  const indexNameEmpty = destinationIndex === '';
  const indexNameValid = isValidIndexName(destinationIndex);
  const indexPatternTitleExists = indexPatternTitles.some(name => destinationIndex === name);

  const valid =
    !transformIdEmpty &&
    transformIdValid &&
    !transformIdExists &&
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
      transformId,
      transformDescription,
      destinationIndex,
      touched: true,
      valid,
    });
  }, [
    continuousModeDateField,
    continuousModeDelay,
    createIndexPattern,
    isContinuousModeEnabled,
    transformId,
    transformDescription,
    destinationIndex,
    valid,
  ]);

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.stepDetailsForm.transformIdLabel', {
          defaultMessage: 'Transform id',
        })}
        isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
        error={[
          ...(!transformIdEmpty && !transformIdValid
            ? [
                i18n.translate('xpack.ml.dataframe.stepDetailsForm.transformIdInvalidError', {
                  defaultMessage:
                    'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                }),
              ]
            : []),
          ...(transformIdExists
            ? [
                i18n.translate('xpack.ml.dataframe.stepDetailsForm.transformIdExistsError', {
                  defaultMessage: 'A transform with this id already exists.',
                }),
              ]
            : []),
        ]}
      >
        <EuiFieldText
          placeholder="transform id"
          value={transformId}
          onChange={e => setTransformId(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.stepDetailsForm.transformIdInputAriaLabel',
            {
              defaultMessage: 'Choose a unique transform id.',
            }
          )}
          isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.stepDetailsForm.transformDescriptionLabel', {
          defaultMessage: 'Transform description',
        })}
        helpText={i18n.translate(
          'xpack.ml.dataframe.stepDetailsForm.transformDescriptionHelpText',
          {
            defaultMessage: 'Optional descriptive text.',
          }
        )}
      >
        <EuiFieldText
          placeholder="transform description"
          value={transformDescription}
          onChange={e => setTransformDescription(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.stepDetailsForm.transformDescriptionInputAriaLabel',
            {
              defaultMessage: 'Choose an optional transform description.',
            }
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.stepDetailsForm.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
        isInvalid={!indexNameEmpty && !indexNameValid}
        helpText={
          indexNameExists &&
          i18n.translate('xpack.ml.dataframe.stepDetailsForm.destinationIndexHelpText', {
            defaultMessage:
              'An index with this name already exists. Be aware that running this transform will modify this destination index.',
          })
        }
        error={
          !indexNameEmpty &&
          !indexNameValid && [
            <Fragment>
              {i18n.translate('xpack.ml.dataframe.stepDetailsForm.destinationIndexInvalidError', {
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
          placeholder="destination index"
          value={destinationIndex}
          onChange={e => setDestinationIndex(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.stepDetailsForm.destinationIndexInputAriaLabel',
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
            i18n.translate('xpack.ml.dataframe.stepDetailsForm.indexPatternTitleError', {
              defaultMessage: 'An index pattern with this title already exists.',
            }),
          ]
        }
      >
        <EuiSwitch
          name="mlDataFrameCreateIndexPattern"
          label={i18n.translate('xpack.ml.dataframe.stepCreateForm.createIndexPatternLabel', {
            defaultMessage: 'Create index pattern',
          })}
          checked={createIndexPattern === true}
          onChange={() => setCreateIndexPattern(!createIndexPattern)}
        />
      </EuiFormRow>
      <EuiFormRow
        helpText={
          isContinuousModeAvailable === false
            ? i18n.translate('xpack.ml.dataframe.stepDetailsForm.continuousModeError', {
                defaultMessage: 'Continuous mode is not available for indices without date fields.',
              })
            : ''
        }
      >
        <EuiSwitch
          name="mlDataFrameContinuousMode"
          label={i18n.translate('xpack.ml.dataframe.stepCreateForm.continuousModeLabel', {
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
              'xpack.ml.dataframe.stepDetailsForm.continuousModeDateFieldLabel',
              {
                defaultMessage: 'Date field',
              }
            )}
            helpText={i18n.translate(
              'xpack.ml.dataframe.stepDetailsForm.continuousModeDateFieldHelpText',
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
            label={i18n.translate('xpack.ml.dataframe.stepDetailsForm.continuousModeDelayLabel', {
              defaultMessage: 'Delay',
            })}
            isInvalid={!isContinuousModeDelayValid}
            error={
              !isContinuousModeDelayValid && [
                i18n.translate('xpack.ml.dataframe.stepDetailsForm.continuousModeDelayError', {
                  defaultMessage: 'Invalid delay format',
                }),
              ]
            }
            helpText={i18n.translate(
              'xpack.ml.dataframe.stepDetailsForm.continuousModeDelayHelpText',
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
                'xpack.ml.dataframe.stepDetailsForm.continuousModeAriaLabel',
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
