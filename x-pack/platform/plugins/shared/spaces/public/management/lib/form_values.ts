/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, mapValues, omitBy } from 'lodash';

import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';
import { getSpaceColor, getSpaceInitials } from '../../space_avatar';
import type { CustomizeSpaceFormValues } from '../types';

/**
 * The space form fills in derived values (initials, color) and replaces cleared fields with empty
 * values as the user interacts with it, none of which are changes the user made. Normalizing them
 * away lets us tell whether anything was actually changed, so that reverting an edit also clears
 * the unsaved changes prompt.
 *
 * List values (`disabledFeatures`) are sorted because the form appends re-added entries to the end
 * of the list, so toggling a value off and back on is a re-order rather than a change.
 *
 * A space without a solution renders as Classic when editing, and the picker writes `'classic'`
 * back, so the two are the same to the user. `hasSolutionViewChanged` on the create form treats
 * them the same way.
 */
const normalize = (values: CustomizeSpaceFormValues) =>
  mapValues(
    omitBy(
      {
        ...values,
        initials: getSpaceInitials(values),
        color: getSpaceColor(values),
        solution: values.solution === SOLUTION_VIEW_CLASSIC ? undefined : values.solution,
      },
      (value) =>
        value == null ||
        value === '' ||
        value === false ||
        (Array.isArray(value) && value.length === 0)
    ),
    (value) => (Array.isArray(value) ? [...value].sort() : value)
  );

/**
 * Determines whether the user has made any changes to a space form, ignoring the values the form
 * derives on their behalf.
 */
export const haveFormValuesChanged = (
  initialValues: CustomizeSpaceFormValues,
  currentValues: CustomizeSpaceFormValues
): boolean => !isEqual(normalize(initialValues), normalize(currentValues));
