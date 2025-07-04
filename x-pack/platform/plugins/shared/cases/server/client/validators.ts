/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { getValidatorForObservableType } from '../../common/observables/validators';
import { OBSERVABLE_TYPES_BUILTIN } from '../../common/constants';
import { type CasesClient } from './client';
import { getAvailableObservableTypesMap } from './observable_types';

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const validateDuplicatedKeysInRequest = ({
  requestFields = [],
  fieldName,
}: {
  requestFields?: Array<{ key: string }>;
  fieldName: string;
}) => {
  const uniqueKeys = new Set<string>();
  const duplicatedKeys = new Set<string>();

  requestFields.forEach((item) => {
    if (uniqueKeys.has(item.key)) {
      duplicatedKeys.add(item.key);
    } else {
      uniqueKeys.add(item.key);
    }
  });

  if (duplicatedKeys.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated ${fieldName} keys in request: ${Array.from(duplicatedKeys.values())}`
    );
  }
};

/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export const validateDuplicatedObservableTypesInRequest = ({
  requestFields = [],
}: {
  requestFields?: Array<{ label: string; key: string }>;
}) => {
  const extractLabelFromItem = (item: { label: string }) => item.label.toLowerCase();
  const extractKeyFromItem = (item: { key: string }) => item.key.toLowerCase();

  // NOTE: this prevents adding duplicates for the builtin types
  const builtinLabels = OBSERVABLE_TYPES_BUILTIN.map(extractLabelFromItem);
  const builtinKeys = OBSERVABLE_TYPES_BUILTIN.map(extractKeyFromItem);

  const uniqueLabels = new Set<string>(builtinLabels);
  const uniqueKeys = new Set<string>(builtinKeys);

  const duplicatedLabels = new Set<string>();

  requestFields.forEach((item) => {
    const observableTypeLabel = extractLabelFromItem(item);
    const observableTypeKey = extractKeyFromItem(item);

    if (uniqueKeys.has(observableTypeKey)) {
      duplicatedLabels.add(observableTypeLabel);
    } else {
      uniqueKeys.add(observableTypeKey);
    }

    if (uniqueLabels.has(observableTypeLabel)) {
      duplicatedLabels.add(observableTypeLabel);
    } else {
      uniqueLabels.add(observableTypeLabel);
    }
  });

  if (duplicatedLabels.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated observable types in request: ${Array.from(duplicatedLabels.values())}`
    );
  }
};

/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export const validateDuplicatedObservablesInRequest = ({
  requestFields = [],
}: {
  requestFields?: Array<{ typeKey: string; value: string }>;
}) => {
  const stringifyItem = (item: { value: string; typeKey: string }) =>
    [item.typeKey, item.value].join();

  const uniqueObservables = new Set<string>();
  const duplicatedObservables = new Set<string>();

  requestFields.forEach((item) => {
    if (uniqueObservables.has(stringifyItem(item))) {
      duplicatedObservables.add(stringifyItem(item));
    } else {
      uniqueObservables.add(stringifyItem(item));
    }
  });

  if (duplicatedObservables.size > 0) {
    throw Boom.badRequest(`Invalid duplicated observables in request.`);
  }
};

/**
 * Throws an error if observable type key is not valid
 */
export const validateObservableTypeKeyExists = async (
  casesClient: CasesClient,
  {
    caseOwner,
    observableTypeKey,
  }: {
    caseOwner: string;
    observableTypeKey: string;
  }
) => {
  const observableTypesSet = await getAvailableObservableTypesMap(casesClient, caseOwner);
  if (!observableTypesSet.has(observableTypeKey)) {
    throw Boom.badRequest(`Invalid observable type, key does not exist: ${observableTypeKey}`);
  }
};

export const validateObservableValue = (
  observableTypeKey: string | undefined,
  observableValue: unknown
) => {
  const validator = getValidatorForObservableType(observableTypeKey);
  const validationError = validator(observableValue);

  if (validationError) {
    throw Boom.badRequest(
      `Observable value "${observableValue}" is not valid for selected observable type ${observableTypeKey}.`
    );
  }
};
