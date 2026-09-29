/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const mockAPIClient = {
  http: vi.fn(),
  list: vi.fn(),
  total: vi.fn(),
  getInfo: vi.fn(),
  getContent: vi.fn(),
  getReportURL: vi.fn(),
  downloadReport: vi.fn(),
};

vi.mock('@kbn/reporting-public/reporting_api_client', () => mockAPIClient);
