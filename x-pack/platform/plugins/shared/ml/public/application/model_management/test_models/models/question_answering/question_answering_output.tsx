/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useEuiFontSize, useEuiTheme, EuiBadge, EuiHorizontalRule } from '@elastic/eui';
import type {
  FormattedQuestionAnsweringResult,
  QuestionAnsweringInference,
} from './question_answering_inference';

const ICON_PADDING = '2px';
const TRIM_CHAR_COUNT = 200;

export const getQuestionAnsweringOutputComponent = (inferrer: QuestionAnsweringInference) => (
  <QuestionAnsweringOutput inferrer={inferrer} />
);

const QuestionAnsweringOutput: FC<{ inferrer: QuestionAnsweringInference }> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result.map(({ response, inputText }) => (
        <>
          <>{insertHighlighting(response[0], inputText)}</>
          <EuiHorizontalRule />
        </>
      ))}
    </>
  );
};

function insertHighlighting(result: FormattedQuestionAnsweringResult, inputText: string) {
  const start = inputText.slice(0, result.startOffset);
  const end = inputText.slice(result.endOffset, inputText.length);
  const truncatedStart =
    start.length > TRIM_CHAR_COUNT
      ? `...${start.slice(start.length - TRIM_CHAR_COUNT, start.length)}`
      : start;
  const truncatedEnd = end.length > TRIM_CHAR_COUNT ? `${end.slice(0, TRIM_CHAR_COUNT)}...` : end;

  return (
    <div style={{ lineHeight: '24px' }}>
      {truncatedStart}
      <ResultBadge>{result.value}</ResultBadge>
      {truncatedEnd}
    </div>
  );
}

const ResultBadge: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs').fontSize;
  const isAmsterdam = euiTheme.themeName === 'EUI_THEME_AMSTERDAM';

  // For Amsterdam, use a `behindText` variant. Borealis doesn't need it because of updated contrasts.
  const badgeColor = isAmsterdam
    ? euiTheme.colors.vis.euiColorVisBehindText5
    : euiTheme.colors.vis.euiColorVis9;

  return (
    <EuiBadge
      color={badgeColor}
      style={{
        marginRight: ICON_PADDING,
        marginTop: `-${ICON_PADDING}`,
        // For Amsterdam, add a border to the badge to improve contrast with the background.
        ...(isAmsterdam ? { border: `1px solid ${euiTheme.colors.vis.euiColorVis5}` } : {}),
        fontSize: euiFontSizeXS,
        padding: '0px 6px',
        pointerEvents: 'none',
      }}
    >
      {children}
    </EuiBadge>
  );
};
