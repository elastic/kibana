/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { CaseUserProfile } from '../../../common/types/domain/user/v1';

export const emptyCaseAssigneesSanitizer = <T extends { assignees?: CaseUserProfile[] }>(
  theCase: T
): T => {
  if (isEmpty(theCase.assignees)) {
    return theCase;
  }

  return {
    ...theCase,
    assignees: theCase.assignees?.filter(({ uid }) => !isEmpty(uid)),
  };
};

export const emptyCasesAssigneesSanitizer = <T extends { assignees?: CaseUserProfile[] }>({
  cases,
}: {
  cases: T[];
}): { cases: T[] } => {
  return {
    cases: cases.map((theCase) => {
      return emptyCaseAssigneesSanitizer(theCase);
    }),
  };
};
