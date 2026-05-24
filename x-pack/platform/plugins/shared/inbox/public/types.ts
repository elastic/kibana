/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { InboxAction } from '@kbn/inbox-common';

export interface InboxClientConfig {
  enabled: boolean;
}

/**
 * Props passed to a per-source detail renderer. The component receives the
 * `InboxAction` that was clicked and is free to fetch additional detail from
 * its own plugin's REST APIs.
 */
export interface InboxActionDetailRendererProps {
  action: InboxAction;
}

export type InboxActionDetailRenderer = ComponentType<InboxActionDetailRendererProps>;

/**
 * Lazy loader for a detail renderer, matching the Kibana convention of
 * code-splitting UI contributed by other plugins.
 */
export type InboxActionDetailRendererLoader = () => Promise<InboxActionDetailRenderer>;

export interface InboxPublicSetup {
  /**
   * Register a per-`sourceApp` React component that renders rich detail for
   * an inbox action inside the respond flyout (diffs, reasoning, etc.).
   *
   * The flyout always renders the standard HITL schema form derived from
   * `InboxAction.input_schema`; the registered component is mounted below
   * it. Providers that only need the default form do not need to register
   * anything.
   *
   * This is the designated extension point for provider-specific UI — do
   * NOT add source-specific fields to `@kbn/inbox-common`'s `InboxAction`
   * schema.
   */
  registerActionDetailRenderer(sourceApp: string, load: InboxActionDetailRendererLoader): void;
}

export interface InboxPublicStart {
  /**
   * Look up a previously-registered detail renderer for a given `sourceApp`.
   * Returns `undefined` when no renderer has been registered.
   */
  getActionDetailRenderer(sourceApp: string): InboxActionDetailRendererLoader | undefined;
}

export type InboxSetupDependencies = Record<string, never>;
export type InboxStartDependencies = Record<string, never>;
