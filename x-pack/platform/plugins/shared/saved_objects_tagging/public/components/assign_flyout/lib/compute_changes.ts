/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssignableObject } from '../../../../common/assignments';
import { AssignmentStatusMap, AssignmentOverrideMap } from '../types';
import { getAssignmentAction, getKey } from '../utils';

/**
 * Compute the list of objects that need to be added or removed from the
 * tag assignation, given their initial status and their current manual override.
 */
export const computeRequiredChanges = ({
  objects,
  initialStatus,
  overrides,
}: {
  objects: AssignableObject[];
  initialStatus: AssignmentStatusMap;
  overrides: AssignmentOverrideMap;
}) => {
  const assigned: AssignableObject[] = [];
  const unassigned: AssignableObject[] = [];

  objects.forEach((object) => {
    const key = getKey(object);
    const status = initialStatus[key];
    const override = overrides[key];

    const action = getAssignmentAction(status, override);
    if (action === 'added') {
      assigned.push(object);
    }
    if (action === 'removed') {
      unassigned.push(object);
    }
  });

  return {
    assigned,
    unassigned,
  };
};
