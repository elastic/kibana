/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from 'react';
import { getStore } from './shared_store';
import type { Action } from '.';

/** What the app gives the part of an action that is drawn: where it is, and how to refresh it. */
export interface ActionUiHost {
  /** The saved app, when there is one, so that what an action does can be traced to it. */
  appId?: string;
  /** Asks the app for its data again, as when what an action did can change what is shown. */
  refreshData: () => void;
}

/** What the app asks of the part of an action that is drawn. */
export interface ActionUiApi {
  /**
   * Does what handlers requested, once the person has had their say. It gets every request that
   * one event made, so that they can be put to the person together. `nodeId` is the component.
   */
  request: (payloads: readonly unknown[], nodeId: string) => void;
  /** Says which actions a component that is shown has, so that what is needed to know can be found out. */
  watch?: (actions: readonly Action[]) => void;
  /** Why these actions cannot be done now, if they cannot. Without a reason they can. */
  gate?: (actions: readonly Action[]) => string | undefined;
}

/**
 * The part of an action that is drawn or that remembers things for as long as an app is shown, such
 * as a dialog to confirm it. It wraps the app, and gives the app its api with `ActionUiBridge`.
 */
export type ActionUiProvider = ComponentType<{ host: ActionUiHost; children: ReactNode }>;

type Apis = Readonly<Record<string, ActionUiApi>>;

/**
 * Made once and kept with the rest of what is registered: every copy of this package, in every
 * plugin, has to use the same context for the app to find what the plugins give it.
 */
const getContext = () => {
  const store = getStore();
  if (!store.actionUiContext) store.actionUiContext = createContext<Apis>({});
  return store.actionUiContext as React.Context<Apis>;
};

/** Gives the app the api of an action, from inside its provider. */
export const ActionUiBridge = ({
  actionId,
  api,
  children,
}: {
  actionId: string;
  api: ActionUiApi;
  children: ReactNode;
}) => {
  const Context = getContext();
  const parent = useContext(Context);
  const value = useMemo(() => ({ ...parent, [actionId]: api }), [parent, actionId, api]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/** The api of each action that has a part that is drawn, by the id of the action. */
export const useActionUis = (): Apis => useContext(getContext());
