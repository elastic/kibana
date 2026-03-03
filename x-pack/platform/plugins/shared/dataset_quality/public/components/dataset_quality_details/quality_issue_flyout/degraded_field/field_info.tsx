/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { capitalize } from 'lodash';
import { useQualityIssues } from '../../../../hooks';
import {
  degradedFieldCurrentFieldLimitColumnName,
  degradedFieldMaximumCharacterLimitColumnName,
  degradedFieldPotentialCauseColumnName,
  degradedFieldValuesColumnName,
} from '../../../../../common/translations';
import { ExpandableTruncatedText } from '../expandable_truncated_text';

export const DegradedFieldInfo = () => {
  const {
    degradedFieldValues,
    isAnalysisInProgress,
    degradedFieldAnalysisFormattedResult,
    degradedFieldAnalysis,
  } = useQualityIssues();

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-cause`}
      >
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs">
            <span>{degradedFieldPotentialCauseColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause"
          grow={false}
        >
          {capitalize(degradedFieldAnalysisFormattedResult?.potentialCause)}
        </EuiFlexItem>
      </EuiFlexGroup>

      {!isAnalysisInProgress && degradedFieldAnalysis?.isFieldLimitIssue && (
        <>
          <EuiFlexGroup
            alignItems="center"
            data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-mappingLimit`}
          >
            <EuiFlexItem grow={1}>
              <EuiTitle size="xxs">
                <span>{degradedFieldCurrentFieldLimitColumnName}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem
              data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-mappingLimit"
              grow={2}
            >
              <span>{degradedFieldAnalysis.totalFieldLimit}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}

      {!isAnalysisInProgress &&
        degradedFieldAnalysisFormattedResult?.shouldDisplayIgnoredValuesAndLimit && (
          <>
            <EuiFlexGroup
              alignItems="center"
              data-test-subj={'datasetQualityDetailsDegradedFieldFlyoutFieldsList-characterLimit'}
            >
              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <span>{degradedFieldMaximumCharacterLimitColumnName}</span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem
                data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-characterLimit"
                css={{ maxWidth: '64%' }}
                grow={false}
              >
                <span>{degradedFieldAnalysis?.fieldMapping?.ignore_above}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiTitle size="xxs">
              <span>{degradedFieldValuesColumnName}</span>
            </EuiTitle>
            <EuiFlexGroup
              direction="column"
              gutterSize="m"
              data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-values"
            >
              {degradedFieldValues?.values.map((value: string) => {
                return (
                  <EuiFlexItem key={value} css={{ lineHeight: '1.6', width: '100%' }}>
                    <ExpandableTruncatedText text={value} truncatedTextLength={95} />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </>
        )}
    </>
  );
};
