/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { basicCase, getUserAction } from '../../../containers/mock';
import type { UserActionUI } from '../../../containers/types';
import { UserActionTypes } from '../../../../common/types/domain';
import { LINKED_INVESTIGATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { getAlertZeroOpening } from './merge_alertzero_opening';

const created = '2026-11-06T10:00:00.000Z';
const createCase = {
  ...getUserAction(UserActionTypes.create_case, 'create'),
  id: 'create',
  createdAt: created,
};

const link = (id: string, createdAt: string, username = createCase.createdBy.username) =>
  ({
    ...getUserAction(UserActionTypes.comment, 'create'),
    id,
    createdAt,
    createdBy: { ...createCase.createdBy, username, profileUid: undefined },
    payload: { comment: { type: LINKED_INVESTIGATION_ATTACHMENT_TYPE, attachmentId: id } },
  } as unknown as UserActionUI);

const alertZeroCase = { ...basicCase, source: 'alertzero' as const };

describe('getAlertZeroOpening', () => {
  it("folds the author's investigation links from the first minute into the opening", () => {
    const opening = getAlertZeroOpening(
      [
        createCase,
        link('a', '2026-11-06T10:00:02.000Z'),
        link('b', '2026-11-06T10:00:03.000Z'),
        link('later', '2026-11-06T10:05:00.000Z'),
        link('someone-else', '2026-11-06T10:00:04.000Z', 'priya'),
      ],
      alertZeroCase
    );

    expect(opening?.createUserActionId).toBe('create');
    expect(opening?.linkedCount).toBe(2);
    expect([...(opening?.mergedUserActionIds ?? [])]).toEqual(['a', 'b']);
  });

  it('leaves ordinary cases and AlertZero cases without links alone', () => {
    expect(
      getAlertZeroOpening([createCase, link('a', '2026-11-06T10:00:02.000Z')], basicCase)
    ).toBeUndefined();
    expect(getAlertZeroOpening([createCase], alertZeroCase)).toBeUndefined();
  });
});
