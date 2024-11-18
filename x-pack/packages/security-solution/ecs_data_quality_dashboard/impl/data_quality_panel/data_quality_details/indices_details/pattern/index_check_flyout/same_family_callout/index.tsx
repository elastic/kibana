/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { FIELDS_WITH_MAPPINGS_SAME_FAMILY, SAME_FAMILY_CALLOUT } from '../translations';

interface Props {
  fieldCount: number;
}

const SameFamilyCalloutComponent: React.FC<Props> = ({ fieldCount }) => {
  return (
    <EuiCallOut color="primary" size="s">
      <div data-test-subj="fieldsDefinedByEcs">
        {SAME_FAMILY_CALLOUT({
          fieldCount,
          version: EcsVersion,
        })}
      </div>
      <EuiSpacer size="s" />
      <div>
        <EuiText data-test-subj="fieldsWithMappingsSameFamily" size="xs">
          {FIELDS_WITH_MAPPINGS_SAME_FAMILY}
        </EuiText>
      </div>
    </EuiCallOut>
  );
};

SameFamilyCalloutComponent.displayName = 'SameFamilyCalloutComponent';

export const SameFamilyCallout = React.memo(SameFamilyCalloutComponent);
