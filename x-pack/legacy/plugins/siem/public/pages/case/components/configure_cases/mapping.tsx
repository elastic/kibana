/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiFormRow,
} from '@elastic/eui';

import * as i18n from './translations';

import { FieldMapping } from './field_mapping';
import { CasesConfigurationMapping } from '../../../../containers/case/configure/types';

interface MappingProps {
  disabled: boolean;
  mapping: CasesConfigurationMapping[] | null;
  onChangeMapping: (newMapping: CasesConfigurationMapping[]) => void;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

const MappingComponent: React.FC<MappingProps> = ({
  disabled,
  mapping,
  onChangeMapping,
  setEditFlyoutVisibility,
}) => {
  const onClick = useCallback(() => setEditFlyoutVisibility(true), []);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.FIELD_MAPPING_TITLE}</h3>}
      description={i18n.FIELD_MAPPING_DESC}
    >
      <EuiFormRow fullWidth>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false} className="euiFormLabel">
            <EuiLink onClick={onClick}>{i18n.UPDATE_CONNECTOR}</EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <FieldMapping disabled={disabled} mapping={mapping} onChangeMapping={onChangeMapping} />
    </EuiDescribedFormGroup>
  );
};

export const Mapping = React.memo(MappingComponent);
