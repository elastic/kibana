/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';

import { useResultsRollupContext } from '../../contexts/results_rollup_context';
import { Pattern } from './pattern';
import { SelectedIndex } from '../../types';
import { useDataQualityContext } from '../../data_quality_context';
import { HISTORICAL_RESULTS_TOUR_IS_ACTIVE_STORAGE_KEY } from './constants';

const StyledPatternWrapperFlexItem = styled(EuiFlexItem)`
  margin-bottom: ${({ theme }) => theme.eui.euiSize};

  &:last-child {
    margin-bottom: 0;
  }
`;

export interface Props {
  chartSelectedIndex: SelectedIndex | null;
  setChartSelectedIndex: (selectedIndex: SelectedIndex | null) => void;
}

const IndicesDetailsComponent: React.FC<Props> = ({
  chartSelectedIndex,
  setChartSelectedIndex,
}) => {
  const { patternRollups, patternIndexNames } = useResultsRollupContext();
  const { patterns } = useDataQualityContext();

  const [isTourActive, setIsTourActive] = useState<boolean>(() => {
    const isActive = localStorage.getItem(HISTORICAL_RESULTS_TOUR_IS_ACTIVE_STORAGE_KEY);
    return isActive !== 'false';
  });

  const handleDismissTour = useCallback(() => {
    setIsTourActive(false);
    localStorage.setItem(HISTORICAL_RESULTS_TOUR_IS_ACTIVE_STORAGE_KEY, 'false');
  }, []);

  const [openPatterns, setOpenPatterns] = useState<Array<{ name: string; isOpen: boolean }>>(() => {
    return patterns.map((pattern) => ({ name: pattern, isOpen: true }));
  });

  const handleAccordionToggle = useCallback((patternName: string, isOpen: boolean) => {
    setOpenPatterns((prevOpenPatterns) => {
      return prevOpenPatterns.map((p) => (p.name === patternName ? { ...p, isOpen } : p));
    });
  }, []);

  const firstOpenPattern = useMemo(
    () => openPatterns.find((pattern) => pattern.isOpen)?.name,
    [openPatterns]
  );

  return (
    <div data-test-subj="indicesDetails">
      {useMemo(
        () =>
          patterns.map((pattern) => (
            <StyledPatternWrapperFlexItem grow={false} key={pattern}>
              <Pattern
                indexNames={patternIndexNames[pattern]}
                pattern={pattern}
                patternRollup={patternRollups[pattern]}
                chartSelectedIndex={chartSelectedIndex}
                setChartSelectedIndex={setChartSelectedIndex}
                isTourActive={isTourActive}
                isFirstOpenPattern={pattern === firstOpenPattern}
                onAccordionToggle={handleAccordionToggle}
                onDismissTour={handleDismissTour}
              />
            </StyledPatternWrapperFlexItem>
          )),
        [
          chartSelectedIndex,
          firstOpenPattern,
          handleAccordionToggle,
          handleDismissTour,
          isTourActive,
          patternIndexNames,
          patternRollups,
          patterns,
          setChartSelectedIndex,
        ]
      )}
    </div>
  );
};

IndicesDetailsComponent.displayName = 'IndicesDetailsComponent';

export const IndicesDetails = React.memo(IndicesDetailsComponent);
