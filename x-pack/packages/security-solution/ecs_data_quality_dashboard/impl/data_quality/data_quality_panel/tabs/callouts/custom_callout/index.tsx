/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { CustomFieldMetadata } from '../../../../types';

import * as i18n from '../../../index_properties/translations';

interface Props {
  children?: React.ReactNode;
  customFieldMetadata: CustomFieldMetadata[];
}

const CustomCalloutComponent: React.FC<Props> = ({ children, customFieldMetadata }) => {
  const title = useMemo(
    () => (
      <span data-test-subj="title">{i18n.CUSTOM_CALLOUT_TITLE(customFieldMetadata.length)}</span>
    ),
    [customFieldMetadata.length]
  );

  return (
    <EuiCallOut color="primary" size="s" title={title}>
      <div data-test-subj="fieldsNotDefinedByEcs">
        {i18n.CUSTOM_CALLOUT({ fieldCount: customFieldMetadata.length, version: EcsVersion })}
      </div>
      <EuiSpacer size="s" />
      <div data-test-subj="ecsIsPermissive">{i18n.ECS_IS_A_PERMISSIVE_SCHEMA}</div>
      {children}
    </EuiCallOut>
  );
};

export const CustomCallout = React.memo(CustomCalloutComponent);
