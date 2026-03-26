/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import type {
  ShapeRef,
  ShapeDrawerComponentProps,
} from '../../../../public/components/shape_drawer';
import { ShapeDrawer, getProgressShape } from '../../../../public/components/shape_drawer';

export const ProgressDrawerComponent = React.forwardRef(
  (props: React.PropsWithChildren<ShapeDrawerComponentProps>, ref: Ref<ShapeRef>) => (
    <ShapeDrawer {...props} ref={ref} getShape={getProgressShape} />
  )
);
