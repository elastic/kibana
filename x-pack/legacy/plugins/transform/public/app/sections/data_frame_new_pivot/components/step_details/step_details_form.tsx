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

import { isKibanaContextInitialized, KibanaContext } from '../../../../lib/kibana';
import { isValidIndexName } from '../../../../../../../ml/common/util/es_utils';

import { api } from '../../../../services/api_service';
import { ml } from '../../../../../../../ml/public/services/ml_api_service';

import { isTransformIdValid, TransformId, TransformPivotConfig } from '../../../../common';
import { EsIndexName, IndexPatternTitle } from './common';
import { delayValidator } from '../../../../common/validators';

export interface StepDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  destinationIndex: EsIndexName;
  isContinuousModeEnabled: boolean;
  touched: boolean;
  transformId: TransformId;
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
  const kibanaContext = useContext(KibanaContext);

  const defaults = { ...getDefaultStepDetailsState(), ...overrides };

  const [transformId, setTransformId] = useState<TransformId>(defaults.transformId);
  const [transformDescription, setTransformDescription] = useState<string>(
    defaults.transformDescription
  );
  const [destinationIndex, setDestinationIndex] = useState<EsIndexName>(defaults.destinationIndex);
  const [transformIds, setTransformIds] = useState<TransformId[]>([]);
  const [indexNames, setIndexNames] = useState<EsIndexName[]>([]);
  const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternTitle[]>([]);
  const [createIndexPattern, setCreateIndexPattern] = useState(defaults.createIndexPattern);

  // Continuous mode state
  const [isContinuousModeEnabled, setContinuousModeEnabled] = useState(
    defaults.isContinuousModeEnabled
  );

  // fetch existing transform IDs and indices once for form validation
  useEffect(() => {
    // use an IIFE to avoid returning a Promise to useEffect.
    (async function() {
      if (isKibanaContextInitialized(kibanaContext)) {
        try {
          setTransformIds(
            (await api.getTransforms()).transforms.map(
              (transform: TransformPivotConfig) => transform.id
            )
          );
        } catch (e) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformList', {
              defaultMessage: 'An error occurred getting the existing transform Ids: {error}',
              values: { error: JSON.stringify(e) },
            })
          );
        }

        try {
          setIndexNames((await ml.getIndices()).map(index => index.name));
        } catch (e) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.stepDetailsForm.errorGettingIndexNames', {
              defaultMessage: 'An error occurred getting the existing index names: {error}',
              values: { error: JSON.stringify(e) },
            })
          );
        }

        try {
          setIndexPatternTitles(await kibanaContext.indexPatterns.getTitles());
        } catch (e) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.stepDetailsForm.errorGettingIndexPatternTitles', {
              defaultMessage:
                'An error occurred getting the existing index pattern titles: {error}',
              values: { error: JSON.stringify(e) },
            })
          );
        }
      }
    })();
  }, [kibanaContext.initialized]);

  if (!isKibanaContextInitialized(kibanaContext)) {
    return null;
  }

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
        label={i18n.translate('xpack.transform.stepDetailsForm.transformIdLabel', {
          defaultMessage: 'Transform id',
        })}
        isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
        error={[
          ...(!transformIdEmpty && !transformIdValid
            ? [
                i18n.translate('xpack.transform.stepDetailsForm.transformIdInvalidError', {
                  defaultMessage:
                    'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                }),
              ]
            : []),
          ...(transformIdExists
            ? [
                i18n.translate('xpack.transform.stepDetailsForm.transformIdExistsError', {
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
          aria-label={i18n.translate('xpack.transform.stepDetailsForm.transformIdInputAriaLabel', {
            defaultMessage: 'Choose a unique transform id.',
          })}
          isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDetailsForm.transformDescriptionLabel', {
          defaultMessage: 'Transform description',
        })}
        helpText={i18n.translate('xpack.transform.stepDetailsForm.transformDescriptionHelpText', {
          defaultMessage: 'Optional descriptive text.',
        })}
      >
        <EuiFieldText
          placeholder="transform description"
          value={transformDescription}
          onChange={e => setTransformDescription(e.target.value)}
          aria-label={i18n.translate(
            'xpack.transform.stepDetailsForm.transformDescriptionInputAriaLabel',
            {
              defaultMessage: 'Choose an optional transform description.',
            }
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDetailsForm.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
        isInvalid={!indexNameEmpty && !indexNameValid}
        helpText={
          indexNameExists &&
          i18n.translate('xpack.transform.stepDetailsForm.destinationIndexHelpText', {
            defaultMessage:
              'An index with this name already exists. Be aware that running this transform will modify this destination index.',
          })
        }
        error={
          !indexNameEmpty &&
          !indexNameValid && [
            <Fragment>
              {i18n.translate('xpack.transform.stepDetailsForm.destinationIndexInvalidError', {
                defaultMessage: 'Invalid destination index name.',
              })}
              <br />
              <EuiLink
                href={`https://www.elastic.co/guide/en/elasticsearch/reference/${metadata.branch}/indices-create-index.html#indices-create-index`}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.transform.stepDetailsForm.destinationIndexInvalidErrorLink',
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
            'xpack.transform.stepDetailsForm.destinationIndexInputAriaLabel',
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
            i18n.translate('xpack.transform.stepDetailsForm.indexPatternTitleError', {
              defaultMessage: 'An index pattern with this title already exists.',
            }),
          ]
        }
      >
        <EuiSwitch
          name="transformCreateIndexPattern"
          label={i18n.translate('xpack.transform.stepCreateForm.createIndexPatternLabel', {
            defaultMessage: 'Create index pattern',
          })}
          checked={createIndexPattern === true}
          onChange={() => setCreateIndexPattern(!createIndexPattern)}
        />
      </EuiFormRow>
      <EuiFormRow
        helpText={
          isContinuousModeAvailable === false
            ? i18n.translate('xpack.transform.stepDetailsForm.continuousModeError', {
                defaultMessage: 'Continuous mode is not available for indices without date fields.',
              })
            : ''
        }
      >
        <EuiSwitch
          name="transformContinuousMode"
          label={i18n.translate('xpack.transform.stepCreateForm.continuousModeLabel', {
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
            label={i18n.translate('xpack.transform.stepDetailsForm.continuousModeDateFieldLabel', {
              defaultMessage: 'Date field',
            })}
            helpText={i18n.translate(
              'xpack.transform.stepDetailsForm.continuousModeDateFieldHelpText',
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
            label={i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayLabel', {
              defaultMessage: 'Delay',
            })}
            isInvalid={!isContinuousModeDelayValid}
            error={
              !isContinuousModeDelayValid && [
                i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayError', {
                  defaultMessage: 'Invalid delay format',
                }),
              ]
            }
            helpText={i18n.translate(
              'xpack.transform.stepDetailsForm.continuousModeDelayHelpText',
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
                'xpack.transform.stepDetailsForm.continuousModeAriaLabel',
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
