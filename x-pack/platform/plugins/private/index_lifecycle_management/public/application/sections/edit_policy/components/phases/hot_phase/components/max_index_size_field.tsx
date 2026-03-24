/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

import { NumericField } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { byteSizeUnits, ROLLOVER_FORM_PATHS } from '../../../../constants';
import { UnitField } from '../../shared_fields/unit_field';

const i18nTexts = {
  deprecationMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeDeprecationMessage',
    {
      defaultMessage:
        'Maximum index size is deprecated and will be removed in a future version. Use maximum primary shard size instead.',
    }
  ),
  maxSizeUnit: {
    ariaLabel: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel', {
      defaultMessage: 'Maximum index size units',
    }),
  },
};

export const MaxIndexSizeField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem style={{ maxWidth: 400 }}>
        <UseField
          path={ROLLOVER_FORM_PATHS.maxSize}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'hot-selectedMaxSizeStored',
              min: 1,
              prepend: (
                <EuiIconTip
                  type="warning"
                  aria-label={i18nTexts.deprecationMessage}
                  content={i18nTexts.deprecationMessage}
                />
              ),
              append: (
                <UnitField
                  path="_meta.hot.customRollover.maxStorageSizeUnit"
                  options={byteSizeUnits}
                  euiFieldProps={{
                    'data-test-subj': 'hot-selectedMaxSizeStoredUnits',
                    'aria-label': i18nTexts.maxSizeUnit.ariaLabel,
                  }}
                />
              ),
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
