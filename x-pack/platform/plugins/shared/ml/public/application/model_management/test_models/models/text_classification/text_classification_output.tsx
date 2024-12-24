/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, Fragment } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiProgress,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

import type {
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
  LangIdentInference,
  FormattedTextClassificationResponse,
} from '.';

export const getTextClassificationOutputComponent = (
  inferrer:
    | TextClassificationInference
    | ZeroShotClassificationInference
    | FillMaskInference
    | LangIdentInference
) => <TextClassificationOutput inferrer={inferrer} />;

export const TextClassificationOutput: FC<{
  inferrer:
    | TextClassificationInference
    | ZeroShotClassificationInference
    | FillMaskInference
    | LangIdentInference;
}> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result.map(({ response, inputText }) => (
        <>
          <PredictionProbabilityList response={response} inputText={inputText} />
          <EuiHorizontalRule />
        </>
      ))}
    </>
  );
};

export const PredictionProbabilityList: FC<{
  response: FormattedTextClassificationResponse;
  inputText?: string;
}> = ({ response, inputText }) => {
  return (
    <>
      {inputText !== undefined ? (
        <>
          <EuiTitle size="xxs">
            <span>{inputText}</span>
          </EuiTitle>
          <EuiSpacer />
        </>
      ) : null}

      {response.map(({ value, predictionProbability }) => (
        <Fragment key={value}>
          <EuiProgress value={predictionProbability * 100} max={100} size="m" />
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj={`mlTestModelLangIdentInputValue`}>{value}</EuiFlexItem>
            <EuiFlexItem data-test-subj={`mlTestModelLangIdentInputProbability`} grow={false}>
              {predictionProbability}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </Fragment>
      ))}
    </>
  );
};
