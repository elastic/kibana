/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourcePublicAPI, DatasourceDimensionPanelProps } from '../types';
import { NativeRenderer } from '../native_renderer';

interface Props extends DatasourceDimensionPanelProps {
  datasource: DatasourcePublicAPI;
  'data-test-subj'?: string;
}

export function DimensionPanel({ datasource, ...props }: Props) {
  return (
    <NativeRenderer
      data-test-subj={props['data-test-subj']}
      render={datasource.renderDimensionPanel}
      nativeProps={props}
    />
  );
}
