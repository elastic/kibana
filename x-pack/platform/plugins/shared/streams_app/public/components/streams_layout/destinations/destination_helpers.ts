/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '../../../services/unit_repository';
import { getUnitDestinations } from './destination_models';

const MAX_DESTINATION_ID_LENGTH = 256;

export type DestinationNameValidationError = 'required' | 'duplicate';

const trimTrailingHyphens = (value: string): string => value.replace(/-+$/, '');

export const slugifyDestinationName = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'destination';
};

/** Stable unit id derived from the destination name, unique among `existingIds`. */
export const createDestinationId = ({
  name,
  existingIds,
}: {
  name: string;
  existingIds: Iterable<string>;
}): string => {
  const baseId = trimTrailingHyphens(
    slugifyDestinationName(name).slice(0, MAX_DESTINATION_ID_LENGTH)
  );
  const taken = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (taken.has(candidate)) {
    const readableSuffix = `-${suffix}`;
    candidate = `${trimTrailingHyphens(
      baseId.slice(0, MAX_DESTINATION_ID_LENGTH - readableSuffix.length)
    )}${readableSuffix}`;
    suffix += 1;
  }

  return candidate;
};

const normalizeDestinationName = (destinationName: string): string =>
  destinationName.trim().toLocaleLowerCase();

export const getDestinationNameValidationError = ({
  destinationName,
  unitDefinition,
}: {
  destinationName: string;
  unitDefinition: Unit;
}): DestinationNameValidationError | undefined => {
  const normalizedDestinationName = normalizeDestinationName(destinationName);
  if (!normalizedDestinationName) {
    return 'required';
  }

  return getUnitDestinations(unitDefinition).some(
    ({ name, id }) => normalizeDestinationName(name ?? id) === normalizedDestinationName
  )
    ? 'duplicate'
    : undefined;
};
