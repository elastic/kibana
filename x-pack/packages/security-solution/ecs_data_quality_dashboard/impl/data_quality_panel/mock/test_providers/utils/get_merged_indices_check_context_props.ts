/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCheckState } from '../../../stub/get_check_state';
import {
  UseIndicesCheckCheckState,
  UseIndicesCheckReturnValue,
} from '../../../hooks/use_indices_check/types';

export const getMergedIndicesCheckContextProps = (
  patternIndexNames: Record<string, string[]>,
  indicesCheckContextProps?: Partial<UseIndicesCheckReturnValue>
): UseIndicesCheckReturnValue => {
  const checkState = Object.keys(patternIndexNames).reduce<UseIndicesCheckCheckState>(
    (acc, key) => {
      for (const indexName of patternIndexNames[key]) {
        acc[indexName] = {
          ...getCheckState(indexName)[indexName],
        };
      }

      return acc;
    },
    {}
  );

  return {
    checkIndex: jest.fn(),
    checkState,
    ...indicesCheckContextProps,
  };
};
