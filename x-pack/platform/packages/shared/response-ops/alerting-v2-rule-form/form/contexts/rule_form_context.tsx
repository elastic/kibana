/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren, ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { ApplicationStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';

export interface RuleFormServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
  lens: LensPublicStart;
  /**
   * When set, Rule Summary (Threshold guided builder) can link to Discover with the ES|QL query.
   * Return undefined when Discover or ES|QL is unavailable.
   */
  getDiscoverHrefForEsql?: (esql: string) => string | undefined;
}

export type RuleFormLayout = 'page' | 'flyout';

/** Entry for the guided-builder picker (title + description shown in the dropdown). */
export interface RuleBuilderCatalogEntry {
  id: string;
  title: string;
  description: string;
}

export interface RuleFormMeta {
  /** Whether the form is rendered on a full page or inside a flyout. */
  layout: RuleFormLayout;
  /**
   * When true, the main evaluation UI is the ES|QL editor; when false, guided builder (or read-only
   * query) mode. The Rule Summary preview shows the generated ES|QL code block only when this is false.
   */
  includeQueryEditor?: boolean;
  /**
   * Optional actions rendered in the Rule evaluation section header (e.g. ES|QL entry affordances).
   */
  ruleEvaluationHeaderActions?: ReactNode;
  /**
   * When set (e.g. `threshold_alert` from the create-rule URL), the form can show builder-specific
   * evaluation controls instead of the default ES|QL editor.
   */
  ruleBuilderId?: string;
  /**
   * Short label for the current rule configuration mode (builder name or ES|QL), shown next to the
   * Rule configuration section title when {@link ruleBuilderCatalog} is not used.
   */
  ruleEvaluationModeLabel?: string;
  /**
   * When set with {@link onRuleBuilderIdChange}, guided mode shows a super select instead of a
   * mode badge so users can switch rule builders.
   */
  ruleBuilderCatalog?: RuleBuilderCatalogEntry[];
  /** Called when the user picks a different builder from the super select. */
  onRuleBuilderIdChange?: (id: string) => void;
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
 */
export const RuleFormProvider = ({
  children,
  services,
  meta = DEFAULT_META,
}: PropsWithChildren<{ services: RuleFormServices; meta?: RuleFormMeta }>) => {
  const value = useMemo(() => ({ services, meta }), [services, meta]);
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
