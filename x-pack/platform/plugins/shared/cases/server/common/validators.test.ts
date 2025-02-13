/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ASSIGNEES_PER_CASE, MAX_USER_ACTIONS_PER_CASE } from '../../common/constants';
import { createUserActionServiceMock } from '../services/mocks';
import { areTotalAssigneesInvalid, validateMaxUserActions } from './validators';

describe('validators', () => {
  describe('areTotalAssigneesInvalid', () => {
    const generateAssignees = (num: number) =>
      Array.from(Array(num).keys()).map((uid) => {
        return { uid: `${uid}` };
      });

    it('validates undefined assignees correctly', () => {
      expect(areTotalAssigneesInvalid()).toBe(false);
    });

    it(`returns false if assignees are less than ${MAX_ASSIGNEES_PER_CASE}`, () => {
      expect(areTotalAssigneesInvalid(generateAssignees(3))).toBe(false);
    });

    it(`returns false if assignees are equal to ${MAX_ASSIGNEES_PER_CASE}`, () => {
      expect(areTotalAssigneesInvalid(generateAssignees(MAX_ASSIGNEES_PER_CASE))).toBe(false);
    });

    it(`returns true if assignees are greater than ${MAX_ASSIGNEES_PER_CASE}`, () => {
      expect(areTotalAssigneesInvalid(generateAssignees(MAX_ASSIGNEES_PER_CASE + 1))).toBe(true);
    });
  });

  describe('validateMaxUserActions', () => {
    const caseId = 'test-case';
    const userActionService = createUserActionServiceMock();

    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE - 1,
    });

    it('does not throw if the limit is not reached', async () => {
      await expect(
        validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 })
      ).resolves.not.toThrow();
    });

    it('throws if the max user actions per case limit is reached', async () => {
      await expect(
        validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 2 })
      ).rejects.toThrow(
        `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
      );
    });

    it('the caseId does not exist in the response', async () => {
      userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
        foobar: MAX_USER_ACTIONS_PER_CASE - 1,
      });

      await expect(
        validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 })
      ).resolves.not.toThrow();
    });
  });
});
