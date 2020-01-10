/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import numeral from '@elastic/numeral';

type Bytes = string | number;

export const formatBytes = (value: Bytes, format: string) => {
  return numeral(value).format(format);
};

export const useFormatBytes = () => {
  return (value: Bytes) => formatBytes(value, '0,0.0b');
};

export const PreferenceFormattedBytesComponent = ({ value }: { value: Bytes }) => (
  <>{useFormatBytes()(value)}</>
);

PreferenceFormattedBytesComponent.displayName = 'PreferenceFormattedBytesComponent';

export const PreferenceFormattedBytes = React.memo(PreferenceFormattedBytesComponent);

PreferenceFormattedBytes.displayName = 'PreferenceFormattedBytes';
