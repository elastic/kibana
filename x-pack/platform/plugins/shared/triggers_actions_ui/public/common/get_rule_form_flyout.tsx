/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPortal, EuiOverlayMask, EuiLoadingSpinner } from '@elastic/eui';
import type { RuleFormProps } from '@kbn/response-ops-rule-form';
import React, { Suspense, lazy } from 'react';
import type { RuleTypeMetaData } from '../types';

export const getRuleFormFlyoutLazy = <MetaData extends RuleTypeMetaData = RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const RuleForm: React.LazyExoticComponent<React.FC<RuleFormProps<MetaData>>> = lazy(() =>
    import('@kbn/response-ops-rule-form').then((module) => ({ default: module.RuleForm }))
  );

  return (
    <Suspense
      fallback={
        <EuiPortal>
          <EuiOverlayMask>
            <EuiLoadingSpinner size="xl" />
          </EuiOverlayMask>
        </EuiPortal>
      }
    >
      <RuleForm {...props} isFlyout />
    </Suspense>
  );
};
