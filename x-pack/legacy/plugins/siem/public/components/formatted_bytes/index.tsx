/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import numeral from '@elastic/numeral';

import { DEFAULT_BYTES_FORMAT } from '../../../common/constants';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';

export const PreferenceFormattedBytes = React.memo<{ value: string | number }>(({ value }) => {
  const [bytesFormat] = useKibanaUiSetting(DEFAULT_BYTES_FORMAT);
  return (
    <>{bytesFormat ? numeral(value).format(bytesFormat) : numeral(value).format('0,0.[000]b')}</>
  );
});

PreferenceFormattedBytes.displayName = 'PreferenceFormattedBytes';
