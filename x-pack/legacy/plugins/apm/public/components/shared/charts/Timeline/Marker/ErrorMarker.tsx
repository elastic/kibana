/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Legend, Shape } from '../../Legend';

interface Props {
  mark: any; // TODO: error mark,
}

export const ErrorMarker: React.FC<Props> = ({ mark }) => {
  return (
    <>
      <EuiToolTip
        id={mark.name}
        position="top"
        content={<div>{mark.name}</div>}
      >
        <Legend clickable color={theme.euiColorDanger} shape={Shape.square} />
      </EuiToolTip>
    </>
  );
};
