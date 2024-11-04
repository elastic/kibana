/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, memo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { useDataQualityContext } from '../../../../../../data_quality_context';
import { useHistoricalResultsContext } from '../../../contexts/historical_results_context';
import { StyledAccordion } from './styles';
import { getFormattedCheckTime } from '../../utils/get_formatted_check_time';
import { IndexResultBadge } from '../../../index_result_badge';
import { HistoricalResult } from './historical_result';
import { StyledText } from '../styles';
import { getCheckTextColor } from '../../../utils/get_check_text_color';
import {
  CHANGE_YOUR_SEARCH_CRITERIA_OR_RUN,
  COUNTED_INCOMPATIBLE_FIELDS,
  NO_RESULTS_MATCH_YOUR_SEARCH_CRITERIA,
  TOGGLE_HISTORICAL_RESULT_CHECKED_AT,
} from './translations';

interface Props {
  indexName: string;
}

export const HistoricalResultsListComponent: FC<Props> = ({ indexName }) => {
  const [accordionState, setAccordionState] = useState<Record<number, boolean>>(() => ({}));
  const historicalResultsAccordionId = useGeneratedHtmlId({ prefix: 'historicalResultsAccordion' });
  const { historicalResultsState } = useHistoricalResultsContext();

  const { formatNumber } = useDataQualityContext();

  const { results } = historicalResultsState;

  return (
    <div data-test-subj="historicalResultsList">
      {results.length > 0 ? (
        <>
          {results.map((result) => (
            <Fragment key={result.checkedAt}>
              <EuiSpacer size="m" />
              <StyledAccordion
                id={historicalResultsAccordionId}
                buttonProps={{
                  'aria-label': TOGGLE_HISTORICAL_RESULT_CHECKED_AT(
                    getFormattedCheckTime(result.checkedAt)
                  ),
                  'data-test-subj': `historicalResultAccordionButton-${result.checkedAt}`,
                }}
                onToggle={(isOpen) => {
                  setAccordionState((prevState) => ({
                    ...prevState,
                    [result.checkedAt]: isOpen,
                  }));
                }}
                buttonContent={
                  <EuiFlexGroup wrap={true} alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <IndexResultBadge incompatible={result.incompatibleFieldCount} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <StyledText size="s">{getFormattedCheckTime(result.checkedAt)}</StyledText>
                    </EuiFlexItem>
                    {!accordionState[result.checkedAt] && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <EuiTextColor color={getCheckTextColor(result.incompatibleFieldCount)}>
                            {formatNumber(result.incompatibleFieldCount)}
                          </EuiTextColor>{' '}
                          {COUNTED_INCOMPATIBLE_FIELDS(result.incompatibleFieldCount)}
                        </EuiText>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
              >
                <HistoricalResult indexName={indexName} historicalResult={result} />
              </StyledAccordion>
            </Fragment>
          ))}
        </>
      ) : (
        <EuiEmptyPrompt
          iconType="clockCounter"
          title={<h2>{NO_RESULTS_MATCH_YOUR_SEARCH_CRITERIA}</h2>}
          body={<p>{CHANGE_YOUR_SEARCH_CRITERIA_OR_RUN}</p>}
        />
      )}
    </div>
  );
};

HistoricalResultsListComponent.displayName = 'HistoricalResultsListComponent';

export const HistoricalResultsList = memo(HistoricalResultsListComponent);
