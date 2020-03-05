/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface HookWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: (args?: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hookProps?: any;
}

export const HookWrapper = ({ hook, hookProps }: HookWrapperProps) => {
  const myHook = hook ? (hookProps ? hook(hookProps) : hook()) : null;
  return <div>{JSON.stringify(myHook)}</div>;
};
