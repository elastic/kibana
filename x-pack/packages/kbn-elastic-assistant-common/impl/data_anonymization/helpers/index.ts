/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacements } from '../../schemas';

export const getIsDataAnonymizable = (rawData: string | Record<string, string[]>): boolean =>
  typeof rawData !== 'string';

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

export const replaceAnonymizedValuesWithOriginalValues = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Replacements;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce((acc, key) => {
        const value = replacements[key];
        return acc.replaceAll(key, value);
      }, messageContent)
    : messageContent;

export const replaceOriginalValuesWithUuidValues = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Replacements;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce((acc, key) => {
        const value = replacements[key];
        return value ? acc.replaceAll(value, key) : acc;
      }, messageContent)
    : messageContent;
