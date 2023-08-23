/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import type { BatchUpdateListItem } from '../context_editor/types';

export const getIsDataAnonymizable = (rawData: string | Record<string, string[]>): boolean =>
  typeof rawData !== 'string';

export interface Stats {
  allowed: number;
  anonymized: number;
  denied: number;
  total: number;
}

export const isAllowed = ({ allowSet, field }: { allowSet: Set<string>; field: string }): boolean =>
  allowSet.has(field);

export const isDenied = ({ allowSet, field }: { allowSet: Set<string>; field: string }): boolean =>
  !allowSet.has(field);

export const isAnonymized = ({
  allowReplacementSet,
  field,
}: {
  allowReplacementSet: Set<string>;
  field: string;
}): boolean => allowReplacementSet.has(field);

export const updateList = ({
  field,
  list,
  operation,
}: {
  field: string;
  list: string[];
  operation: 'add' | 'remove';
}): string[] => {
  if (operation === 'add') {
    return list.includes(field) ? list : [...list, field];
  } else {
    return list.filter((x) => x !== field);
  }
};

export const updateSelectedPromptContext = ({
  field,
  operation,
  selectedPromptContext,
  update,
}: {
  field: string;
  operation: 'add' | 'remove';
  selectedPromptContext: SelectedPromptContext;
  update:
    | 'allow'
    | 'allowReplacement'
    | 'defaultAllow'
    | 'defaultAllowReplacement'
    | 'deny'
    | 'denyReplacement';
}): SelectedPromptContext => {
  const { allow, allowReplacement } = selectedPromptContext;

  switch (update) {
    case 'allow':
      return {
        ...selectedPromptContext,
        allow: updateList({ field, list: allow, operation }),
      };
    case 'allowReplacement':
      return {
        ...selectedPromptContext,
        allowReplacement: updateList({ field, list: allowReplacement, operation }),
      };
    default:
      return selectedPromptContext;
  }
};

export const updateDefaultList = ({
  currentList,
  setDefaultList,
  update,
  updates,
}: {
  currentList: string[];
  setDefaultList: React.Dispatch<React.SetStateAction<string[]>>;
  update: 'allow' | 'allowReplacement' | 'defaultAllow' | 'defaultAllowReplacement' | 'deny';
  updates: BatchUpdateListItem[];
}): void => {
  const filteredUpdates = updates.filter((x) => x.update === update);

  if (filteredUpdates.length > 0) {
    const updatedList = filteredUpdates.reduce(
      (acc, { field, operation }) => updateList({ field, list: acc, operation }),
      currentList
    );

    setDefaultList(updatedList);
  }
};

export const updateDefaults = ({
  defaultAllow,
  defaultAllowReplacement,
  setDefaultAllow,
  setDefaultAllowReplacement,
  updates,
}: {
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  setDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
  updates: BatchUpdateListItem[];
}): void => {
  updateDefaultList({
    currentList: defaultAllow,
    setDefaultList: setDefaultAllow,
    update: 'defaultAllow',
    updates,
  });

  updateDefaultList({
    currentList: defaultAllowReplacement,
    setDefaultList: setDefaultAllowReplacement,
    update: 'defaultAllowReplacement',
    updates,
  });
};
