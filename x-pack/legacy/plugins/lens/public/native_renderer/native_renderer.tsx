/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { HTMLAttributes } from 'react';

export interface NativeRendererProps<T> extends HTMLAttributes<HTMLDivElement> {
  render: (domElement: Element, props: T) => void;
  nativeProps: T;
  tag?: string;
}

/**
 * A component which takes care of providing a mountpoint for a generic render
 * function which takes an html element and an optional props object.
 * By default the mountpoint element will be a div, this can be changed with the
 * `tag` prop.
 *
 * @param props
 */
export function NativeRenderer<T>({ render, nativeProps, tag, ...rest }: NativeRendererProps<T>) {
  return React.createElement(tag || 'div', {
    ...rest,
    ref: el => el && render(el, nativeProps),
  });
}
