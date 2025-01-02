/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTextColor } from '@elastic/eui';
import { UnitField } from './unit_field';
import { timeUnits } from '../../../constants';
import { UseField } from '../../../form';
import { NumericField } from '../../../../../../shared_imports';
import { ToggleFieldWithDescribedFormRow } from '../../described_form_row';
// import { LearnMoreLink } from '../../learn_more_link';
import { i18nTexts } from '../../../i18n_texts';
import { PhaseWithDownsample } from '../../../../../../../common/types';

interface Props {
  phase: PhaseWithDownsample;
}

export const DownsampleField: React.FunctionComponent<Props> = ({ phase }) => {
  // const { docLinks } = useKibana().services;

  const downsampleEnabledPath = `_meta.${phase}.downsample.enabled`;
  const downsampleIntervalSizePath = `_meta.${phase}.downsample.fixedIntervalSize`;
  const downsampleIntervalUnitsPath = `_meta.${phase}.downsample.fixedIntervalUnits`;

  return (
    <ToggleFieldWithDescribedFormRow
      title={<h3>{i18nTexts.editPolicy.downsampleLabel}</h3>}
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.downsampleDescription"
            defaultMessage="Roll up documents within a fixed interval to a single summary document. Reduces the index footprint by storing time series data at reduced granularity."
          />{' '}
          {/* TODO: add when available*/}
          {/* <LearnMoreLink docPath={docLinks.links.elasticsearch.ilmDownsample} /> */}
        </EuiTextColor>
      }
      fullWidth
      titleSize="xs"
      switchProps={{
        'data-test-subj': `${phase}-downsampleSwitch`,
        path: downsampleEnabledPath,
      }}
    >
      <UseField
        path={downsampleIntervalSizePath}
        key={downsampleIntervalSizePath}
        component={NumericField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': `${phase}-downsampleFixedInterval`,
            min: 1,
            append: (
              <UnitField
                path={downsampleIntervalUnitsPath}
                options={timeUnits}
                euiFieldProps={{
                  'data-test-subj': `${phase}-downsampleFixedIntervalUnits`,
                  'aria-label': i18nTexts.editPolicy.downsampleIntervalFieldUnitsLabel,
                }}
              />
            ),
          },
        }}
      />
    </ToggleFieldWithDescribedFormRow>
  );
};
