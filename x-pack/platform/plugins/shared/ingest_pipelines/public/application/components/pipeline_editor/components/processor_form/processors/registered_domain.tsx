/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';

import { from } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import type { SerializerFunc } from '../../../../../../shared_imports';

export const RegisteredDomain: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.registeredDomain.fieldNameHelpText',
          { defaultMessage: 'Field containing the fully qualified domain name.' }
        )}
      />

      <TargetField />

      <IgnoreMissingField
        defaultValue={true}
        serializer={from.undefinedIfValue(true) as SerializerFunc<boolean>}
      />
    </>
  );
};
