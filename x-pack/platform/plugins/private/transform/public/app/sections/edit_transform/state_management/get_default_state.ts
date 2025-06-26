/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
} from '../../../../../common/constants';
import type { TransformConfigUnion } from '../../../../../common/types/transform';

import { initializeFormField } from './form_field';
import { initializeFormSection } from './form_section';
import type { State } from './edit_transform_flyout_state';

// Takes in a transform configuration and returns the default state to populate the form.
// It supports overrides to apply a pre-existing configuration.
// The implementation of this function is the only one that's specifically required to define
// the features of the transform edit form. All other functions are generic and could be reused
// in the future for other forms.
export const getDefaultState = (config?: TransformConfigUnion): State => ({
  formFields: {
    // top level attributes
    description: initializeFormField('description', 'description', config),
    frequency: initializeFormField('frequency', 'frequency', config, {
      defaultValue: DEFAULT_TRANSFORM_FREQUENCY,
      validator: 'frequencyValidator',
    }),

    // dest.*
    destinationIndex: initializeFormField('destinationIndex', 'dest.index', config, {
      dependsOn: ['destinationIngestPipeline'],
      isOptional: false,
    }),
    destinationIngestPipeline: initializeFormField(
      'destinationIngestPipeline',
      'dest.pipeline',
      config,
      {
        dependsOn: ['destinationIndex'],
        isOptional: true,
      }
    ),

    // settings.*
    docsPerSecond: initializeFormField('docsPerSecond', 'settings.docs_per_second', config, {
      isNullable: true,
      isOptional: true,
      validator: 'integerAboveZeroValidator',
      valueParser: 'nullableNumberParser',
    }),
    maxPageSearchSize: initializeFormField(
      'maxPageSearchSize',
      'settings.max_page_search_size',
      config,
      {
        defaultValue: `${DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE}`,
        isNullable: true,
        isOptional: true,
        validator: 'transformSettingsPageSearchSizeValidator',
        valueParser: 'numberParser',
      }
    ),
    numFailureRetries: initializeFormField(
      'numFailureRetries',
      'settings.num_failure_retries',
      config,
      {
        defaultValue: undefined,
        isNullable: true,
        isOptional: true,
        validator: 'transformSettingsNumberOfRetriesValidator',
        valueParser: 'numberParser',
      }
    ),

    // retention_policy.*
    retentionPolicyField: initializeFormField(
      'retentionPolicyField',
      'retention_policy.time.field',
      config,
      {
        dependsOn: ['retentionPolicyMaxAge'],
        isNullable: false,
        isOptional: true,
        isOptionalInSection: false,
        section: 'retentionPolicy',
      }
    ),
    retentionPolicyMaxAge: initializeFormField(
      'retentionPolicyMaxAge',
      'retention_policy.time.max_age',
      config,
      {
        dependsOn: ['retentionPolicyField'],
        isNullable: false,
        isOptional: true,
        isOptionalInSection: false,
        section: 'retentionPolicy',
        validator: 'retentionPolicyMaxAgeValidator',
      }
    ),
  },
  formSections: {
    retentionPolicy: initializeFormSection('retentionPolicy', 'retention_policy', config),
  },
});
