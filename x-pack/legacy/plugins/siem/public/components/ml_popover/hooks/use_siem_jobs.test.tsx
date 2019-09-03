/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockGroupsResponse } from '../__mocks__/api';
import { getSiemJobIdsFromGroupsData } from './use_siem_jobs';

describe('useSiemJobs', () => {
  describe('getSiemJobsFromGroupData', () => {
    test('returns all jobIds for siem group', () => {
      const siemJobIds = getSiemJobIdsFromGroupsData(mockGroupsResponse);
      expect(siemJobIds.length).toEqual(6);
    });
  });
});
