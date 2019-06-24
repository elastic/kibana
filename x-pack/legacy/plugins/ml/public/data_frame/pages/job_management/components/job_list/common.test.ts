/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockDataFrameJobListRow from './__mocks__/data_frame_job_list_row.json';

import { DATA_FRAME_RUNNING_STATE, isCompletedBatchJob } from './common';

describe('Data Frame: isCompletedBatchJob()', () => {
  test('isCompletedBatchJob()', () => {
    // check the job config/state against the conditions
    // that will be used by isCompletedBatchJob()
    // followed by a call to isCompletedBatchJob() itself
    expect(mockDataFrameJobListRow.state.checkpoint === 1).toBe(true);
    expect(mockDataFrameJobListRow.sync === undefined).toBe(true);
    expect(mockDataFrameJobListRow.state.task_state === DATA_FRAME_RUNNING_STATE.STOPPED).toBe(
      true
    );
    expect(isCompletedBatchJob(mockDataFrameJobListRow)).toBe(true);

    // adapt the mock config to resemble a non-completed job.
    mockDataFrameJobListRow.state.checkpoint = 0;
    expect(isCompletedBatchJob(mockDataFrameJobListRow)).toBe(false);
  });
});
