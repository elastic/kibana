/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const createEventTrackerMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      createReport: jest.fn(),
      claimJob: jest.fn(),
      completeJobScreenshot: jest.fn(),
      completeJobCsv: jest.fn(),
      failJob: jest.fn(),
      completeNotification: jest.fn(),
      failedNotification: jest.fn(),
      downloadReport: jest.fn(),
      deleteReport: jest.fn(),
    };
  });
};

export const eventTrackerMock = {
  create: createEventTrackerMock(),
};
