/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useLayoutEffect } from 'react';
import { EuiFlyout, getFlyoutManagerStore, useGeneratedHtmlId } from '@elastic/eui';

/**
 * The EuiFlyout props that open a flyout on top of another in EUI's flyout history, such as Index
 * Management's details, so its Back button returns there. Its title names it in the history's menu.
 * Without a history, a flyout opens on its own.
 */
export const getFlyoutHistoryProps = (historyKey: symbol | undefined, title: string) =>
  historyKey ? { session: 'start' as const, historyKey, flyoutMenuProps: { title } } : {};

interface FlyoutOnTopProps {
  historyKey: symbol;
  title: string;
  onClose: () => void;
  size: number;
  'aria-labelledby': string;
  'data-test-subj'?: string;
  children: ReactNode;
}

/**
 * A flyout opened on top of another in their history, such as a form opened from a form, which
 * returns to the one beneath when it closes, as its Back button does. EUI closes every flyout in a
 * history when the one on top unmounts, so this goes back first: React cleans up a component before
 * the ones it renders.
 */
export const FlyoutOnTop = ({ historyKey, title, children, ...flyoutProps }: FlyoutOnTopProps) => {
  const id = useGeneratedHtmlId({ prefix: 'boostFlyoutOnTop' });
  useLayoutEffect(
    () => () => {
      const store = getFlyoutManagerStore();
      const { sessions } = store.getState();
      if (sessions[sessions.length - 1]?.mainFlyoutId === id) {
        store.goBack();
      }
    },
    [id]
  );
  return (
    <EuiFlyout
      {...flyoutProps}
      {...getFlyoutHistoryProps(historyKey, title)}
      id={id}
      paddingSize="m"
      ownFocus
    >
      {children}
    </EuiFlyout>
  );
};
