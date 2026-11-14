/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiMarkdownFormat, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TestEndpointResult } from '../../../../../../../common/types';

interface TestEndpointResultProps {
  result: TestEndpointResult;
}

export const TestEndpointResultView: React.FC<TestEndpointResultProps> = ({ result }) => {
  switch (result.type) {
    case 'text':
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="testEndpointResponse">
          <EuiMarkdownFormat>{result.content}</EuiMarkdownFormat>
        </EuiPanel>
      );
    case 'embedding':
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="testEndpointResponse">
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.embeddingSummary', {
                defaultMessage: 'The endpoint returned a vector with {dimensions} dimensions.',
                values: { dimensions: result.dimensions },
              })}
            </p>
            <EuiCode data-test-subj="testEndpointEmbeddingPreview">
              {`[${result.preview.join(', ')}${
                result.dimensions > result.preview.length ? ', ...' : ''
              }]`}
            </EuiCode>
          </EuiText>
        </EuiPanel>
      );
    case 'sparse_embedding':
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="testEndpointResponse">
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.sparseSummary', {
                defaultMessage: 'The endpoint returned {tokenCount} weighted tokens.',
                values: { tokenCount: result.tokenCount },
              })}
            </p>
            <ul data-test-subj="testEndpointSparseTokens">
              {result.topTokens.map(({ token, weight }) => (
                <li key={token}>{`${token}: ${weight.toFixed(3)}`}</li>
              ))}
            </ul>
          </EuiText>
        </EuiPanel>
      );
    case 'rerank':
      return (
        <EuiPanel hasShadow={false} hasBorder data-test-subj="testEndpointResponse">
          <EuiText size="s">
            <ol data-test-subj="testEndpointRanking">
              {result.ranking.map(({ index, text, score }) => (
                <li key={index}>{`${score.toFixed(3)}: ${text}`}</li>
              ))}
            </ol>
          </EuiText>
        </EuiPanel>
      );
  }
};
