/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiFieldText, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { TextInput } from '../text_input';
import type { ZeroShotClassificationInference } from './zero_shot_classification_inference';
import { INPUT_TYPE, RUNNING_STATE } from '../inference_base';

const ClassNameInput: FC<{
  inferrer: ZeroShotClassificationInference;
}> = ({ inferrer }) => {
  const runningState = useObservable(inferrer.getRunningState$(), inferrer.getRunningState());
  const labelsText = useObservable(inferrer.getLabelsText$(), inferrer.getLabelsText());
  const multiLabel = useObservable(inferrer.getMultiLabel$(), inferrer.getMultiLabel());

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.ml.trainedModels.testModelsFlyout.textClassification.classNamesInput',
          {
            defaultMessage: 'Class labels',
          }
        )}
        helpText={i18n.translate(
          'xpack.ml.trainedModels.testModelsFlyout.textClassification.classNamesHelpText',
          {
            defaultMessage: 'Separate the labels with commas',
          }
        )}
      >
        <EuiFieldText
          value={labelsText}
          disabled={runningState === RUNNING_STATE.RUNNING}
          fullWidth
          onChange={(e) => inferrer.setLabelsText(e.target.value)}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        helpText={i18n.translate(
          'xpack.ml.trainedModels.testModelsFlyout.textClassification.multiLabelHelpText',
          {
            defaultMessage: 'Enable the input text to match more than one label.',
          }
        )}
      >
        <EuiSwitch
          label={i18n.translate(
            'xpack.ml.trainedModels.testModelsFlyout.textClassification.multiLabelSwitch',
            {
              defaultMessage: 'Multi label',
            }
          )}
          checked={multiLabel}
          onChange={(e) => inferrer.setMultiLabel(e.target.checked)}
        />
      </EuiFormRow>
    </>
  );
};

export const getZeroShotClassificationInput = (
  inferrer: ZeroShotClassificationInference,
  placeholder?: string
) => (
  <>
    {inferrer.getInputType() === INPUT_TYPE.TEXT ? (
      <>
        <TextInput placeholder={placeholder} inferrer={inferrer} />
        <EuiSpacer />
      </>
    ) : null}
    <ClassNameInput inferrer={inferrer} />
  </>
);
