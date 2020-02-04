/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared';
import { useLogEntryCategoryExamples } from '../../use_log_entry_category_examples';
import { CategoryExampleMessage, useExampleColumnWidths } from './category_example_message';

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

  const { columnWidths, CharacterDimensionsProbe } = useExampleColumnWidths();

  return (
    <>
      <CharacterDimensionsProbe />
      <div>
        {logEntryCategoryExamples.map((categoryExample, categoryExampleIndex) => (
          <CategoryExampleMessage
            columnWidths={columnWidths}
            key={categoryExampleIndex}
            message={categoryExample.message}
            timestamp={categoryExample.timestamp}
          />
        ))}
      </div>
    </>
  );
};
