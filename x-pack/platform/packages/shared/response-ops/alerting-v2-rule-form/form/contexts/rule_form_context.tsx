/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { WorkflowFormComponentProps } from '../types';

export interface RuleFormServices<TWorkflow extends object = object> {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
  lens: LensPublicStart;
  workflowForm: {
    Component: React.ComponentType<WorkflowFormComponentProps<TWorkflow>>;
    defaultValue: () => TWorkflow;
    /** Returns true when the current workflow value satisfies submission requirements. */
    isValid?: (value: TWorkflow) => boolean;
    /**
     * Set to false to hide the single-action create UI entirely.
     * Defaults to true when omitted.
     */
    supported?: boolean;
  };
  uiActions?: UiActionsStart;
}

export const NOOP_WORKFLOW_FORM: RuleFormServices['workflowForm'] = {
  Component: () => null,
  defaultValue: () => ({}),
  supported: false,
};

export type RuleFormLayout = 'page' | 'flyout';

export interface RuleFormMeta {
  /** Whether the form is rendered on a full page or inside a flyout. */
  layout: RuleFormLayout;
}

interface RuleFormContextValue {
  services: RuleFormServices;
  meta: RuleFormMeta;
}

const DEFAULT_META: RuleFormMeta = { layout: 'page' };

const RuleFormContext = createContext<RuleFormContextValue | undefined>(undefined);

/**
 * Provides services and metadata to all rule form descendants.
 *
 * `meta` defaults to `{ layout: 'page' }` when omitted.
 *
 * Accepts `RuleFormServices<TWorkflow>` for any `TWorkflow` so callers need
 * no cast when passing a narrowly-typed services object.
 */
export const RuleFormProvider = <TWorkflow extends object = object>({
  children,
  services,
  meta = DEFAULT_META,
}: PropsWithChildren<{
  services: RuleFormServices<TWorkflow>;
  meta?: RuleFormMeta;
}>): React.ReactElement => {
  const value = useMemo(
    // The cast collapses the concrete TWorkflow to unknown at the context boundary.
    // This is intentional: internal consumers (NotificationsStep) operate on unknown
    // workflow values; the typed boundary lives at the call-site (ComposeDiscoverFlyout).
    () => ({ services: services as unknown as RuleFormServices, meta }),
    [services, meta]
  );
  return <RuleFormContext.Provider value={value}>{children}</RuleFormContext.Provider>;
};

const useRuleFormContext = (): RuleFormContextValue => {
  const context = useContext(RuleFormContext);
  if (!context) {
    throw new Error('useRuleFormContext must be used within RuleFormProvider');
  }
  return context;
};

/** Backward-compatible hook that returns only the services object. */
export const useRuleFormServices = (): RuleFormServices => {
  const { services } = useRuleFormContext();
  return services;
};

/** Returns the form metadata (layout, etc.). */
export const useRuleFormMeta = (): RuleFormMeta => {
  const { meta } = useRuleFormContext();
  return meta;
};
