/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCHEDULED_UNENROLL_ACTION_ID_PREFIX } from '../../../../../../../../common/constants';

import { getAction } from './helpers';

describe('getAction', () => {
  it('describes an unenrollment scheduled by the automatic task', () => {
    // The task stores these as plain UNENROLL actions, so the id prefix is the only signal.
    const actionId = `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}6a1b0f7c-1234-4e2a-9f1d-abcdef012345`;

    expect(getAction('UNENROLL', actionId)).toEqual({
      inProgressText: 'Automatic unenrolling',
      completedText: 'automatically unenrolled',
      cancelledText: 'automatic unenrollment',
    });
  });

  it('describes a manual unenrollment', () => {
    expect(getAction('UNENROLL', '6a1b0f7c-1234-4e2a-9f1d-abcdef012345')).toEqual({
      inProgressText: 'Unenrolling',
      completedText: 'unenrolled',
      cancelledText: 'unenrollment',
    });
  });

  it('only matches the prefix at the start of the action id', () => {
    expect(getAction('UNENROLL', `manual-${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}abc`)).toEqual(
      getAction('UNENROLL', 'some-other-id')
    );
  });

  it('describes a force unenrollment', () => {
    expect(getAction('FORCE_UNENROLL', 'some-action-id').inProgressText).toEqual(
      'Force unenrolling'
    );
  });

  it('falls back to a generic description for an unknown or missing type', () => {
    const generic = {
      inProgressText: 'Actioning',
      completedText: 'actioned',
      cancelledText: 'action',
    };

    expect(getAction('SOMETHING_NEW', 'some-action-id')).toEqual(generic);
    expect(getAction(undefined, undefined)).toEqual(generic);
  });
});
