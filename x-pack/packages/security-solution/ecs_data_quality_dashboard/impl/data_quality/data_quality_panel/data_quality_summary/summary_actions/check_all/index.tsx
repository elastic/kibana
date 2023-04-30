/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat, EcsVersion } from '@kbn/ecs';

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { checkIndex } from './check_index';
import { getAllIndicesToCheck } from './helpers';
import * as i18n from '../../../../translations';
import type { EcsMetadata, IndexToCheck, OnCheckCompleted } from '../../../../types';

const CheckAllButton = styled(EuiButton)`
  width: 112px;
`;

async function wait(ms: number) {
  const delay = () =>
    new Promise((resolve) =>
      setTimeout(() => {
        resolve('');
      }, ms)
    );

  return delay();
}

interface Props {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhases: string[];
  incrementCheckAllIndiciesChecked: () => void;
  onCheckCompleted: OnCheckCompleted;
  patternIndexNames: Record<string, string[]>;
  patterns: string[];
  setCheckAllIndiciesChecked: (checkAllIndiciesChecked: number) => void;
  setCheckAllTotalIndiciesToCheck: (checkAllTotalIndiciesToCheck: number) => void;
  setIndexToCheck: (indexToCheck: IndexToCheck | null) => void;
}

const DELAY_AFTER_EVERY_CHECK_COMPLETES = 3000; // ms

const CheckAllComponent: React.FC<Props> = ({
  formatBytes,
  formatNumber,
  ilmPhases,
  incrementCheckAllIndiciesChecked,
  onCheckCompleted,
  patternIndexNames,
  patterns,
  setCheckAllIndiciesChecked,
  setCheckAllTotalIndiciesToCheck,
  setIndexToCheck,
}) => {
  const abortController = useRef(new AbortController());
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const cancelIfRunning = useCallback(() => {
    if (isRunning) {
      if (!abortController.current.signal.aborted) {
        setIndexToCheck(null);
        setIsRunning(false);
        setCheckAllIndiciesChecked(0);
        setCheckAllTotalIndiciesToCheck(0);
        abortController.current.abort();
      }
    }
  }, [isRunning, setCheckAllIndiciesChecked, setCheckAllTotalIndiciesToCheck, setIndexToCheck]);

  const onClick = useCallback(() => {
    async function beginCheck() {
      const allIndicesToCheck = getAllIndicesToCheck(patternIndexNames);
      setCheckAllIndiciesChecked(0);
      setCheckAllTotalIndiciesToCheck(allIndicesToCheck.length);

      for (const { indexName, pattern } of allIndicesToCheck) {
        if (!abortController.current.signal.aborted) {
          setIndexToCheck({
            indexName,
            pattern,
          });

          await checkIndex({
            abortController: abortController.current,
            ecsMetadata: EcsFlat as unknown as Record<string, EcsMetadata>,
            formatBytes,
            formatNumber,
            indexName,
            onCheckCompleted,
            pattern,
            version: EcsVersion,
          });

          if (!abortController.current.signal.aborted) {
            await wait(DELAY_AFTER_EVERY_CHECK_COMPLETES);
            incrementCheckAllIndiciesChecked();
          }
        }
      }

      if (!abortController.current.signal.aborted) {
        setIndexToCheck(null);
        setIsRunning(false);
      }
    }

    if (isRunning) {
      cancelIfRunning();
    } else {
      abortController.current = new AbortController();
      setIsRunning(true);
      beginCheck();
    }
  }, [
    cancelIfRunning,
    formatBytes,
    formatNumber,
    incrementCheckAllIndiciesChecked,
    isRunning,
    onCheckCompleted,
    patternIndexNames,
    setCheckAllIndiciesChecked,
    setCheckAllTotalIndiciesToCheck,
    setIndexToCheck,
  ]);

  useEffect(() => {
    return () => {
      // cancel any checks in progress when the patterns or ilm phases change
      cancelIfRunning();
    };
  }, [cancelIfRunning, ilmPhases, patterns]);

  useEffect(() => {
    return () => {
      abortController.current.abort();
    };
  }, [abortController]);

  const disabled = ilmPhases.length === 0;

  return (
    <CheckAllButton
      aria-label={isRunning ? i18n.CANCEL : i18n.CHECK_ALL}
      data-test-subj="checkAll"
      disabled={disabled}
      fill={!isRunning}
      onClick={onClick}
    >
      {isRunning ? i18n.CANCEL : i18n.CHECK_ALL}
    </CheckAllButton>
  );
};

export const CheckAll = React.memo(CheckAllComponent);
