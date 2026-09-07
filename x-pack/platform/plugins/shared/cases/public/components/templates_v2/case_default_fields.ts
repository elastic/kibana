/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAssignees } from '../../../common/types/domain_zod/user/v1';

/**
 * Case-default fields a user can edit directly from the template render panel. These map to the
 * top-level case defaults inside the template definition YAML (case title = `name`).
 */
export type EditableCaseDefaultField =
  | 'name'
  | 'description'
  | 'severity'
  | 'category'
  | 'tags'
  | 'assignees';

/** Value shape accepted for an editable case default (strings, tag lists, or assignees). */
export type EditableCaseDefaultValue = string | string[] | CaseAssignees;

/** Change handler shared by every component that edits case defaults from the render panel. */
export type OnCaseDefaultChange = (
  field: EditableCaseDefaultField,
  value: EditableCaseDefaultValue
) => void;
