/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { NumericField } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { byteSizeUnits, ROLLOVER_FORM_PATHS } from '../../../../constants';
import { UnitField } from '../../shared_fields/unit_field';

export const MinIndexSizeField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem style={{ maxWidth: 400 }}>
        <UseField
          path={ROLLOVER_FORM_PATHS.minSize}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'hot-selectedMinSizeStored',
              min: 1,
              append: (
                <UnitField
                  path="_meta.hot.customRollover.minStorageSizeUnit"
                  options={byteSizeUnits}
                  euiFieldProps={{
                    'data-test-subj': 'hot-selectedMinSizeStoredUnits',
                    'aria-label': i18n.translate(
                      'xpack.indexLifecycleMgmt.hotPhase.minimumIndexSizeUnitsAriaLabel',
                      {
                        defaultMessage: 'Minimum index size units',
                      }
                    ),
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
