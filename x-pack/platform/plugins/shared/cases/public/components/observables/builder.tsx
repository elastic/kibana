/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { type ComponentType } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../../../common/constants';
import { fieldsConfig } from './fields_config';
import * as i18n from './translations';

const sharedProps = {
  path: 'value',
  componentProps: {
    euiFieldProps: {
      'data-test-subj': 'observable-value-field',
      placeholder: i18n.SELECT_OBSERVABLE_VALUE_PLACEHOLDER,
    },
  },
  component: TextField,
} as const;

const cachedComponents = Object.freeze({
  generic: () => <UseField {...sharedProps} config={fieldsConfig.value.generic} />,
  [OBSERVABLE_TYPE_EMAIL.key]: () => (
    <UseField {...sharedProps} config={fieldsConfig.value[OBSERVABLE_TYPE_EMAIL.key]} />
  ),
  [OBSERVABLE_TYPE_URL.key]: () => (
    <UseField {...sharedProps} config={fieldsConfig.value[OBSERVABLE_TYPE_URL.key]} />
  ),
  [OBSERVABLE_TYPE_IPV4.key]: () => (
    <UseField {...sharedProps} config={fieldsConfig.value[OBSERVABLE_TYPE_IPV4.key]} />
  ),
  [OBSERVABLE_TYPE_IPV6.key]: () => (
    <UseField {...sharedProps} config={fieldsConfig.value[OBSERVABLE_TYPE_IPV6.key]} />
  ),
  [OBSERVABLE_TYPE_DOMAIN.key]: () => (
    <UseField {...sharedProps} config={fieldsConfig.value[OBSERVABLE_TYPE_DOMAIN.key]} />
  ),
} as const) as Record<string, ComponentType>;

/*
 * Returns value component with validation config matching the type (or generic value component if the specialized field is not found).
 */
export const getDynamicValueField = (observableType: string) =>
  cachedComponents[observableType] ?? cachedComponents.generic;
