/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueChoiceGroup } from '@kbn/streams-schema';
import type { ObjectValue } from './values';

export const findChoiceGroup = (
  groups: readonly CatalogueChoiceGroup[] | undefined,
  fieldName: string
): CatalogueChoiceGroup | undefined => groups?.find((group) => group.fields.includes(fieldName));

/** Whether the group must have a member chosen at all times. */
export const isMandatoryChoiceGroup = (group: CatalogueChoiceGroup): boolean =>
  group.min_selected === 1;

export const getDefaultChoice = (group: CatalogueChoiceGroup): string | undefined =>
  isMandatoryChoiceGroup(group) ? group.default_field ?? group.fields[0] : group.default_field;

/**
 * The member present in the object is the selected one, even while it is still blank;
 * otherwise only a mandatory group counts its default as chosen.
 */
export const getSelectedChoice = (
  group: CatalogueChoiceGroup,
  value: ObjectValue
): string | undefined => {
  const present = group.fields.find((name) => value[name] !== undefined);
  if (present) {
    return present;
  }
  return isMandatoryChoiceGroup(group) ? getDefaultChoice(group) : undefined;
};

/** Whether the field is a member of a choice group that has another member selected. */
export const isUnselectedChoice = (
  groups: readonly CatalogueChoiceGroup[] | undefined,
  value: ObjectValue,
  fieldName: string
): boolean => {
  const group = findChoiceGroup(groups, fieldName);
  return group !== undefined && getSelectedChoice(group, value) !== fieldName;
};

/**
 * Drops the values of the group's other fields and marks the chosen one as
 * present with `initialValue`, so the selection survives until it is filled in.
 */
export const applyChoice = (
  group: CatalogueChoiceGroup,
  value: ObjectValue,
  selected: string | undefined,
  initialValue: ObjectValue[string]
): ObjectValue => {
  const next: ObjectValue = { ...value };
  for (const name of group.fields) {
    if (name !== selected) {
      delete next[name];
    }
  }
  if (selected !== undefined && next[selected] === undefined) {
    next[selected] = initialValue;
  }
  return next;
};
