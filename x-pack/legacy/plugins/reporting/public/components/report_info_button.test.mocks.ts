/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockJobQueueClient = { list: jest.fn(), total: jest.fn(), getInfo: jest.fn() };
jest.mock('../lib/job_queue_client', () => ({ jobQueueClient: mockJobQueueClient }));
