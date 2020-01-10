/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared';
import { useLogEntryCategoryExamples } from '../../use_log_entry_category_examples';

export const CategoryDetailsRow: React.FunctionComponent<{
  categoryId: number;
  timeRange: TimeRange;
  sourceId: string;
}> = ({ categoryId, timeRange, sourceId }) => {
  const { getLogEntryCategoryExamples, logEntryCategoryExamples } = useLogEntryCategoryExamples({
    categoryId,
    endTime: timeRange.endTime,
    exampleCount: 5,
    sourceId,
    startTime: timeRange.startTime,
  });

  useEffect(() => {
    getLogEntryCategoryExamples();
  }, [getLogEntryCategoryExamples]);

  return (
    <div>
      {logEntryCategoryExamples.map(categoryExample => (
        <div>{categoryExample.message}</div>
      ))}
    </div>
  );
};
