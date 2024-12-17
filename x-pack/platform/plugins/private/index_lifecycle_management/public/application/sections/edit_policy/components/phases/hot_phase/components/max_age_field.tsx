/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { NumericField } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { ROLLOVER_FORM_PATHS, timeUnits } from '../../../../constants';
import { UnitField } from '../../shared_fields/unit_field';

export const MaxAgeField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem style={{ maxWidth: 400 }}>
        <UseField
          path={ROLLOVER_FORM_PATHS.maxAge}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': `hot-selectedMaxAge`,
              min: 1,
              append: (
                <UnitField
                  path="_meta.hot.customRollover.maxAgeUnit"
                  options={timeUnits}
                  euiFieldProps={{
                    'data-test-subj': 'hot-selectedMaxAgeUnits',
                    'aria-label': i18n.translate(
                      'xpack.indexLifecycleMgmt.hotPhase.maximumAgeUnitsAriaLabel',
                      {
                        defaultMessage: 'Maximum age units',
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
