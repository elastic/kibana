/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil } from 'lodash';
import type { FieldsConfiguration, InferenceEndpointRequestBody } from '@kbn/inference-common';
import { unflattenObject } from '../utils/unflatten_object';

type ProviderSettings = NonNullable<InferenceEndpointRequestBody['config']['providerConfig']>;

const isEmptyValue = (value: ProviderSettings[string]): boolean => isNil(value) || value === '';

/**
 * Returns the provider settings and secrets that the service marks as updatable and that have a value.
 */
export const getUpdatableServiceSettings = (
  configurations: FieldsConfiguration,
  providerConfig: ProviderSettings = {},
  providerSecrets: ProviderSettings = {}
): ProviderSettings => {
  const updatableEntries = Object.entries({ ...providerConfig, ...providerSecrets }).filter(
    ([key, value]) => configurations[key]?.updatable === true && !isEmptyValue(value)
  );

  return unflattenObject<ProviderSettings>(Object.fromEntries(updatableEntries));
};
