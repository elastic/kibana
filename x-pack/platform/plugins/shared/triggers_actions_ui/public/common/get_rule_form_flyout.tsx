/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPortal,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleFormProps } from '@kbn/response-ops-rule-form';
import React, { Suspense, lazy } from 'react';
import type { RuleTypeMetaData } from '../types';

const RuleForm: React.LazyExoticComponent<React.FC<RuleFormProps<any>>> = lazy(() =>
  import('@kbn/response-ops-rule-form').then((module) => ({ default: module.RuleForm }))
);

export const getRuleFormFlyoutLazy = <MetaData extends RuleTypeMetaData = RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const isEdit = !!props.id;
  return (
    <Suspense
      fallback={
        <EuiPortal>
          <EuiOverlayMask>
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiEmptyPrompt
                color="plain"
                data-test-subj="ruleFormFlyoutLoading"
                icon={<EuiLoadingSpinner size="xl" />}
                title={
                  <h2>
                    {isEdit
                      ? i18n.translate('xpack.triggersActionsUI.ruleFormFlyout.loadingEditText', {
                          defaultMessage: 'Loading edit rule form',
                        })
                      : i18n.translate('xpack.triggersActionsUI.ruleFormFlyout.loadingCreateText', {
                          defaultMessage: 'Loading create rule form',
                        })}
                  </h2>
                }
              />
            </EuiFlexGroup>
          </EuiOverlayMask>
        </EuiPortal>
      }
    >
      <RuleForm {...props} isFlyout />
    </Suspense>
  );
};
