/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { NumericField } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { byteSizeUnits, ROLLOVER_FORM_PATHS } from '../../../../constants';
import { i18nTexts } from '../../../../i18n_texts';
import { UnitField } from '../../shared_fields/unit_field';

export const MaxPrimaryShardSizeField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem style={{ maxWidth: 400 }}>
        <UseField
          path={ROLLOVER_FORM_PATHS.maxPrimaryShardSize}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'hot-selectedMaxPrimaryShardSize',
              min: 1,
              append: (
                <UnitField
                  path="_meta.hot.customRollover.maxPrimaryShardSizeUnit"
                  options={byteSizeUnits}
                  euiFieldProps={{
                    'data-test-subj': 'hot-selectedMaxPrimaryShardSizeUnits',
                    'aria-label': i18nTexts.editPolicy.maxPrimaryShardSizeUnitsLabel,
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
