/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { CapabilityManifest } from './define_capability';
import {
  getStore,
  type AnyAction,
  type AnyCapability,
  type CapabilityViewLoader,
} from './shared_store';
import type { ActionManifest } from './define_action';
import type { ActionHandler } from './action_handler';
import type { ActionUiProvider } from './action_ui';
import type { CapabilityDoc } from './define_capability';
import type { DocumentResolver } from './document_resolver';

export type { AnyAction, AnyCapability, CapabilityViewLoader };

/**
 * Adds a capability. An id can be registered once. The browser also says how to draw it; the
 * server only needs the manifest.
 */
export const registerCapability = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>,
  view?: CapabilityViewLoader
): void => {
  const { capabilities, views } = getStore();
  const known = capabilities.get(manifest.id);
  if (known && known !== (manifest as unknown as AnyCapability)) {
    throw new Error(`The capability "${manifest.id}" is registered already`);
  }
  capabilities.set(manifest.id, manifest as unknown as AnyCapability);
  if (view) views.set(manifest.id, view);
};

export const getCapability = (id: string): AnyCapability | undefined =>
  getStore().capabilities.get(id);

export const listCapabilities = (): readonly AnyCapability[] =>
  Array.from(getStore().capabilities.values());

/** How to draw a capability that was registered with a view. */
export const getCapabilityViewLoader = (id: string): CapabilityViewLoader | undefined =>
  getStore().views.get(id);

/** Adds a step that finishes the document an agent wrote, before it is checked and kept. */
export const registerDocumentResolver = <Context>(resolver: DocumentResolver<Context>): void => {
  const { documentResolvers } = getStore();
  if (!documentResolvers.includes(resolver as DocumentResolver)) {
    documentResolvers.push(resolver as DocumentResolver);
  }
};

export const listDocumentResolvers = (): readonly DocumentResolver<never>[] =>
  getStore().documentResolvers;

/**
 * Adds an action. An id can be registered once. The browser also says how to carry it out, and
 * what it needs drawn, such as a dialog to confirm it; the server only needs the manifest, to
 * check the documents that use it.
 */
export const registerAction = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: ActionManifest<Id, Shape>,
  handler?: ActionHandler<never>,
  ui?: ActionUiProvider
): void => {
  const { actions, actionHandlers, actionUiProviders } = getStore();
  const known = actions.get(manifest.id);
  if (known && known !== (manifest as unknown as AnyAction)) {
    throw new Error(`The action "${manifest.id}" is registered already`);
  }
  actions.set(manifest.id, manifest as unknown as AnyAction);
  if (handler) actionHandlers.set(manifest.id, handler as ActionHandler);
  if (ui) actionUiProviders.set(manifest.id, ui);
};

export const getAction = (id: string): AnyAction | undefined => getStore().actions.get(id);

export const listActions = (): readonly AnyAction[] => Array.from(getStore().actions.values());

/** How to carry out an action that was registered with a handler. */
export const getActionHandler = (id: string): ActionHandler | undefined =>
  getStore().actionHandlers.get(id);

/** The parts of actions that are drawn, for the app to put around what it shows. */
export const listActionUiProviders = (): ReadonlyArray<readonly [string, ActionUiProvider]> =>
  Array.from(getStore().actionUiProviders.entries());

/**
 * Tells an agent what to do with a type of panel that an app can hold as an embeddable: when to use
 * it, the state it takes and an example. The plugin that owns the panel registers it, and the
 * panel works without it, for a person who copies its state from a dashboard.
 */
export const registerEmbeddableDoc = (embeddableType: string, doc: CapabilityDoc): void => {
  getStore().embeddableDocs.set(embeddableType, doc);
};

export const listEmbeddableDocs = (): ReadonlyArray<readonly [string, CapabilityDoc]> =>
  Array.from(getStore().embeddableDocs.entries());
