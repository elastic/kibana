/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface HookWrapperProps {
  hook: (args?: unknown) => unknown;
  hookProps?: unknown;
}

export const HookWrapper = ({ hook, hookProps }: HookWrapperProps) => {
  const myHook = hook ? (hookProps ? hook(hookProps) : hook()) : null;
  return <div>{JSON.stringify(myHook)}</div>;
};

export const HookFuncWrapper = ({
  children,
  hook,
  hookProps,
}: HookWrapperProps & { children: (hookData: unknown) => React.ReactNode | null }) => {
  const myHook = hook ? (hookProps ? hook(hookProps) : hook()) : null;
  return <>{() => children(myHook)}</>;
};
