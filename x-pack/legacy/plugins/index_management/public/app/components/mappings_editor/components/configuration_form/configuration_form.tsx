/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import { Types } from '../../mappings_state';
import { DynamicMappingForm } from './dynamic_mapping_form';
import { SourceFieldForm } from './source_field_form';

type MappingsConfiguration = Types['MappingsConfiguration'];
type SourceField = Types['SourceField'];

interface Props {
  configurationDefaultValue?: MappingsConfiguration;
  sourceFieldDefaultValue?: SourceField;
}

export const ConfigurationForm = React.memo(
  ({ configurationDefaultValue, sourceFieldDefaultValue }: Props) => {
    return (
      <>
        <DynamicMappingForm defaultValue={configurationDefaultValue} />
        <EuiSpacer size="xl" />
        <SourceFieldForm defaultValue={sourceFieldDefaultValue} />
      </>
    );
  }
);
