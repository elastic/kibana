/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from '../../../index_properties/translations';
import type { EcsBasedFieldMetadata } from '../../../../types';

interface Props {
  children?: React.ReactNode;
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[];
}

const SameFamilyCalloutComponent: React.FC<Props> = ({ children, ecsBasedFieldMetadata }) => {
  const title = useMemo(
    () => (
      <span data-test-subj="title">
        {i18n.SAME_FAMILY_CALLOUT_TITLE(ecsBasedFieldMetadata.length)}
      </span>
    ),
    [ecsBasedFieldMetadata.length]
  );

  return (
    <EuiCallOut color="primary" size="s" title={title}>
      <div data-test-subj="fieldsDefinedByEcs">
        {i18n.SAME_FAMILY_CALLOUT({
          fieldCount: ecsBasedFieldMetadata.length,
          version: EcsVersion,
        })}
      </div>
      <EuiSpacer size="s" />
      <div>
        <EuiText data-test-subj="fieldsWithMappingsSameFamily" size="xs">
          {i18n.FIELDS_WITH_MAPPINGS_SAME_FAMILY}
        </EuiText>
      </div>
      {children}
    </EuiCallOut>
  );
};

export const SameFamilyCallout = React.memo(SameFamilyCalloutComponent);
