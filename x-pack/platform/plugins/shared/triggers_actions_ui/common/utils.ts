/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, ReactElement } from 'react';

export const nonNullable = <T>(v: T): v is NonNullable<T> => v != null;

export function typedForwardRef<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => ReactElement
): (props: P & React.RefAttributes<T>) => ReactElement {
  return forwardRef(render) as any;
}
