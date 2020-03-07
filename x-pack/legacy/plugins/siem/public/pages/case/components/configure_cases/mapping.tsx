/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDescribedFormGroup } from '@elastic/eui';

import * as i18n from './translations';

import { FieldMapping } from './field_mapping';
import { CasesConfigurationMapping } from '../../../../containers/case/configure/types';

interface MappingProps {
  disabled: boolean;
  mappings: CasesConfigurationMapping[] | null;
  onChangeMappings: (newMappings: CasesConfigurationMapping[]) => void;
}

const MappingComponent: React.FC<MappingProps> = ({ disabled, mappings, onChangeMappings }) => (
  <EuiDescribedFormGroup
    fullWidth
    title={<h3>{i18n.FIELD_MAPPING_TITLE}</h3>}
    description={i18n.FIELD_MAPPING_DESC}
  >
    <FieldMapping disabled={disabled} mappings={mappings} onChangeMappings={onChangeMappings} />
  </EuiDescribedFormGroup>
);

export const Mapping = React.memo(MappingComponent);
