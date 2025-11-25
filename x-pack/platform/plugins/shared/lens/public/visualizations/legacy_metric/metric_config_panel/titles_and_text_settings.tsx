/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LegacyMetricState } from '@kbn/lens-common';
import { TitlePositionOptions } from './title_position_option';
import { TextFormattingOptions } from './text_formatting_options';

export const LegacyMetricTitlesAndTextSettings: React.FC<{
  state: LegacyMetricState;
  setState: (newState: LegacyMetricState) => void;
}> = (props) => {
  return (
    <>
      <TextFormattingOptions {...props} />
      <TitlePositionOptions {...props} />
    </>
  );
};
