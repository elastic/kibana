/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { AddToCaseContextProvider } from './add_to_cases';
import { useAddToCaseAction } from './use_add_to_case_action';
import type { UseAddToCaseActionArgs } from './use_add_to_case_action';

export interface AddToCaseActionBridgeProps extends UseAddToCaseActionArgs {
  /** Receives the latest handler that opens the "Add to existing case" modal. */
  openRef: MutableRefObject<(() => void) | undefined>;
  /** Called with `true` once the lazily loaded cases context is mounted, `false` on unmount. */
  onReadyChange: (isReady: boolean) => void;
}

const AddToCaseActionRegistrar = ({
  openRef,
  onReadyChange,
  ...args
}: AddToCaseActionBridgeProps) => {
  const { handleClick } = useAddToCaseAction(args);

  useEffect(() => {
    openRef.current = handleClick;

    return () => {
      openRef.current = undefined;
    };
  }, [handleClick, openRef]);

  // Separate from the ref effect so handler identity changes don't toggle readiness state.
  useEffect(() => {
    onReadyChange(true);

    return () => onReadyChange(false);
  }, [onReadyChange]);

  return null;
};

/**
 * Mounts the cases context headlessly so an app menu item can open the "Add to existing case"
 * modal. Scoping the provider to this bridge (instead of wrapping the whole page) keeps the
 * page's own react-query hooks on the Osquery query client, as the inline button did before.
 */
export const AddToCaseActionBridge = (props: AddToCaseActionBridgeProps) => (
  <AddToCaseContextProvider>
    <AddToCaseActionRegistrar {...props} />
  </AddToCaseContextProvider>
);
