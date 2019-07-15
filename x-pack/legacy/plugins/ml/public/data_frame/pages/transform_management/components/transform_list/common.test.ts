/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockDataFrameTransformListRow from './__mocks__/data_frame_transform_list_row.json';

import { DATA_FRAME_TASK_STATE, isCompletedBatchTransform } from './common';

describe('Data Frame: isCompletedBatchTransform()', () => {
  test('isCompletedBatchTransform()', () => {
    // check the transform config/state against the conditions
    // that will be used by isCompletedBatchTransform()
    // followed by a call to isCompletedBatchTransform() itself
    expect(mockDataFrameTransformListRow.state.checkpoint === 1).toBe(true);
    expect(mockDataFrameTransformListRow.sync === undefined).toBe(true);
    expect(mockDataFrameTransformListRow.state.task_state === DATA_FRAME_TASK_STATE.STOPPED).toBe(
      true
    );
    expect(isCompletedBatchTransform(mockDataFrameTransformListRow)).toBe(true);

    // adapt the mock config to resemble a non-completed transform.
    mockDataFrameTransformListRow.state.checkpoint = 0;
    expect(isCompletedBatchTransform(mockDataFrameTransformListRow)).toBe(false);
  });
});
