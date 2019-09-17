/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockDataFrameTransformListRow from '../../../../common/__mocks__/data_frame_transform_list_row.json';

import {
  DataFrameTransformListRow,
  isCompletedBatchTransform,
  DATA_FRAME_TRANSFORM_STATE,
} from '../../../../common';

describe('Transform: isCompletedBatchTransform()', () => {
  test('isCompletedBatchTransform()', () => {
    // check the transform config/state against the conditions
    // that will be used by isCompletedBatchTransform()
    // followed by a call to isCompletedBatchTransform() itself
    const row = mockDataFrameTransformListRow as DataFrameTransformListRow;
    expect(row.stats.checkpointing.last.checkpoint === 1).toBe(true);
    expect(row.config.sync === undefined).toBe(true);
    expect(row.stats.state === DATA_FRAME_TRANSFORM_STATE.STOPPED).toBe(true);
    expect(isCompletedBatchTransform(mockDataFrameTransformListRow)).toBe(true);

    // adapt the mock config to resemble a non-completed transform.
    row.stats.checkpointing.last.checkpoint = 0;
    expect(isCompletedBatchTransform(mockDataFrameTransformListRow)).toBe(false);
  });
});
