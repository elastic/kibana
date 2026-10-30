/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FC, ReactNode } from 'react';
import React, { lazy } from 'react';
import { isTopLevelAppEnabled } from '../../common/top_level_app';
import type { RegisteredUnifiedAttachmentType } from './types';

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

  return {
    ...type,
    getCreationActivity: (props: Parameters<T['getCreationActivity']>[0]) => {
      const activity = type.getCreationActivity(props as never);
      return {
        ...activity,
        children: activity.children ? wrap(activity.children, true) : undefined,
        getActions: activity.getActions
          ? (actionProps: never) =>
              activity.getActions?.(actionProps).map((action) =>
                'render' in action
                  ? {
                      ...action,
                      render: () => (
                        <ProvidersInTopLevelApp providers={providers}>
                          {action.render()}
                        </ProvidersInTopLevelApp>
                      ),
                    }
                  : action
              ) ?? []
          : undefined,
      };
    },
    getAttachmentList: type.getAttachmentList
      ? (props?: never) => {
          const list = type.getAttachmentList?.(props);
          return list?.children ? { ...list, children: wrap(list.children, false) } : list;
        }
      : undefined,
  } as T;
};
