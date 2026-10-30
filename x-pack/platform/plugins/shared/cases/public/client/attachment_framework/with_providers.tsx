/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FC, ReactNode } from 'react';
import React, { isValidElement, lazy } from 'react';
import { isTopLevelAppEnabled } from '../../common/top_level_app';
import type { AttachmentAction, RegisteredUnifiedAttachmentType } from './types';

type Providers = ComponentType<{ children: ReactNode }>;

const ProvidersInTopLevelApp: FC<{ providers: Providers; children: ReactNode }> = ({
  providers: TypeProviders,
  children,
}) => (isTopLevelAppEnabled() ? <TypeProviders>{children}</TypeProviders> : <>{children}</>);
ProvidersInTopLevelApp.displayName = 'ProvidersInTopLevelApp';

/**
 * Wraps every renderer of an attachment type in the type's `providers`. Wrapped components are
 * cached, so a renderer keeps its identity across renders and does not remount.
 */
export const withAttachmentProviders = <T extends RegisteredUnifiedAttachmentType>(type: T): T => {
  const { providers } = type;
  if (!providers) {
    return type;
  }

  const wrapped = new WeakMap<object, ComponentType<never>>();
  const wrap = <C extends ComponentType<never>>(Component: C, asLazy: boolean): C => {
    const cached = wrapped.get(Component);
    if (cached) {
      return cached as C;
    }
    const Wrapped: FC<Record<string, unknown>> = (props) => {
      const Inner = Component as ComponentType<Record<string, unknown>>;
      return (
        <ProvidersInTopLevelApp providers={providers}>
          <Inner {...props} />
        </ProvidersInTopLevelApp>
      );
    };
    Wrapped.displayName = 'AttachmentProviders';
    const result = (asLazy ? lazy(async () => ({ default: Wrapped })) : Wrapped) as unknown as C;
    wrapped.set(Component, result);
    return result;
  };

  const wrapNode = <N,>(node: N): N =>
    isValidElement(node)
      ? ((<ProvidersInTopLevelApp providers={providers}>{node}</ProvidersInTopLevelApp>) as N)
      : node;
  const wrapAction = <A extends AttachmentAction | null>(action: A): A =>
    action && 'render' in action ? { ...action, render: () => wrapNode(action.render()) } : action;

  return {
    ...type,
    getCreationActivity: (props: Parameters<T['getCreationActivity']>[0]) => {
      const activity = type.getCreationActivity(props as never);
      return {
        ...activity,
        event: wrapNode(activity.event),
        children: activity.children ? wrap(activity.children, true) : undefined,
        getActions: activity.getActions
          ? (actionProps: never) => activity.getActions?.(actionProps).map(wrapAction) ?? []
          : undefined,
      };
    },
    getRemovalActivity: type.getRemovalActivity
      ? (props: never) => {
          const activity = type.getRemovalActivity?.(props);
          return activity ? { ...activity, event: wrapNode(activity.event) } : activity;
        }
      : undefined,
    getDocumentAction: type.getDocumentAction
      ? (props: never) => wrapAction(type.getDocumentAction?.(props) ?? null)
      : undefined,
    getAttachmentList: type.getAttachmentList
      ? (props?: never) => {
          const list = type.getAttachmentList?.(props);
          return list?.children ? { ...list, children: wrap(list.children, false) } : list;
        }
      : undefined,
  } as T;
};
