/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import React, { Suspense, ComponentType } from 'react';
import { IndexSettingWithContextProps } from './index_settings_with_context_types';

const IndexSettingsWithContext = dynamic<ComponentType<IndexSettingWithContextProps>>(() =>
  import('./index_settings_with_context').then((mod) => ({ default: mod.IndexSettingsWithContext }))
);

export const IndexSettings: React.FC<IndexSettingWithContextProps> = (props) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <IndexSettingsWithContext {...props} />
    </Suspense>
  );
};
