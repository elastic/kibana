/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, FormEventHandler } from 'react';
import React, { useState, useMemo, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { EuiFlexGroup, EuiSpacer, EuiTabs, EuiTab, EuiForm } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { ErrorMessage } from '../../inference_error';
import type { InferrerType } from '..';
import { OutputLoadingContent } from '../../output_loading';
import { RUNNING_STATE } from '../inference_base';
import { RawOutput } from '../raw_output';
import { InputFormControls } from './input_form_controls';

interface Props {
  inferrer: InferrerType;
}

enum TAB {
  TEXT,
  RAW,
}

export const TextInputForm: FC<Props> = ({ inferrer }) => {
  const [selectedTab, setSelectedTab] = useState(TAB.TEXT);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isValid = useObservable(inferrer.getIsValid$(), inferrer.getIsValid());
  const runningState = useObservable(inferrer.getRunningState$(), inferrer.getRunningState());
  const inputComponent = useMemo(() => inferrer.getInputComponent(), [inferrer]);
  const outputComponent = useMemo(() => inferrer.getOutputComponent(), [inferrer]);
  const infoComponent = useMemo(() => inferrer.getInfoComponent(), [inferrer]);

  const run: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      setErrorText(null);
      try {
        await inferrer.infer();
      } catch (e) {
        setErrorText(extractErrorMessage(e));
      }
    },
    [inferrer]
  );

  return (
    <EuiForm component={'form'} onSubmit={run}>
      <>{infoComponent}</>
      <>{inputComponent}</>
      <EuiSpacer size="m" />
      <div>
        <EuiFlexGroup>
          <InputFormControls
            testButtonDisabled={runningState === RUNNING_STATE.RUNNING || isValid === false}
            createPipelineButtonDisabled={
              runningState === RUNNING_STATE.RUNNING || isValid === false
            }
            inferrer={inferrer}
          />
        </EuiFlexGroup>
      </div>
      {runningState !== RUNNING_STATE.STOPPED ? (
        <>
          <EuiSpacer size="m" />
          <EuiTabs size={'s'}>
            <EuiTab
              isSelected={selectedTab === TAB.TEXT}
              onClick={setSelectedTab.bind(null, TAB.TEXT)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.markupTab"
                defaultMessage="Output"
              />
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === TAB.RAW}
              onClick={setSelectedTab.bind(null, TAB.RAW)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.rawOutput"
                defaultMessage="Raw output"
              />
            </EuiTab>
          </EuiTabs>

          <EuiSpacer size="m" />

          {selectedTab === TAB.TEXT ? (
            <>
              {runningState === RUNNING_STATE.RUNNING ? <OutputLoadingContent text={''} /> : null}

              {errorText !== null || runningState === RUNNING_STATE.FINISHED_WITH_ERRORS ? (
                <>
                  <ErrorMessage errorText={errorText} />
                  <EuiSpacer />
                </>
              ) : null}

              {runningState === RUNNING_STATE.FINISHED ? (
                <div data-test-subj={'mlTestModelOutput'}>{outputComponent}</div>
              ) : null}
            </>
          ) : (
            <RawOutput inferrer={inferrer} />
          )}
        </>
      ) : null}
    </EuiForm>
  );
};
