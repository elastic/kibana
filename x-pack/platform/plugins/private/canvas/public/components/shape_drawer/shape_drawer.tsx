/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, Ref, useImperativeHandle } from 'react';
import { ShapeDrawerProps, ShapeRef } from './shape_factory';

function ShapeDrawerComponent(props: ShapeDrawerProps, ref: Ref<ShapeRef>) {
  const { shapeType, getShape } = props;
  const Shape = getShape(shapeType);

  if (!Shape) throw new Error("Shape doesn't exist.");

  useImperativeHandle(ref, () => ({ getData: () => Shape.data }), [Shape]);

  return <Shape.Component {...props} />;
}

export const ShapeDrawer = forwardRef(ShapeDrawerComponent);
