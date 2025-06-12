/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type Theme, useTheme } from '@emotion/react';
import React, { forwardRef } from 'react';

export const withAttrs = (
  Component: React.ComponentType<any>,
  fn: (args: { theme: Theme; props: any }) => any
) =>
  forwardRef((props: any, ref) => {
    const theme = useTheme();
    const attrs = fn({ theme, props });

    return <Component {...props} {...attrs} ref={ref} />;
  });
