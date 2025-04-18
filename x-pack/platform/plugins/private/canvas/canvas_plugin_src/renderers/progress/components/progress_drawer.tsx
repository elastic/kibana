/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref } from 'react';
import {
  ShapeDrawer,
  ShapeRef,
  ShapeDrawerComponentProps,
  getShape,
} from '../../../../public/components/shape_drawer';

export const ProgressDrawerComponent = React.forwardRef(
  (props: React.PropsWithChildren<ShapeDrawerComponentProps>, ref: Ref<ShapeRef>) => (
    <ShapeDrawer {...props} ref={ref} getShape={getShape} />
  )
);
