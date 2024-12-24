/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, FC } from 'react';
import React from 'react';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface IntervalTimerangeSelectorProps {
  setAddIntervalTimerange: Dispatch<React.SetStateAction<boolean>>;
  addIntervalTimerange: boolean;
  disabled: boolean;
}

/*
 * React component for the form for adding a custom time range.
 */
export const IntervalTimerangeSelector: FC<IntervalTimerangeSelectorProps> = ({
  setAddIntervalTimerange,
  addIntervalTimerange,
  disabled,
}) => {
  return (
    <>
      <EuiSpacer size="xs" />
      <EuiSwitch
        data-test-subj="mlJobCustomUrlIntervalTimeRangeSwitch"
        disabled={disabled}
        showLabel={true}
        label={i18n.translate('xpack.ml.customUrlsEditor.addIntervalTimeRangeSwitchLabel', {
          defaultMessage: 'Add interval time range',
        })}
        checked={addIntervalTimerange}
        onChange={(e) => setAddIntervalTimerange(e.target.checked)}
      />
    </>
  );
};
