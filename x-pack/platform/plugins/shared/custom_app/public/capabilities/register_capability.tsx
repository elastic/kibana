/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { combineLatest } from 'rxjs';
import type { Action, AppNode } from '@kbn/custom-app-common';
import {
  getCapability,
  type CapabilitySourceState,
  type CapabilityViewProps as CustomAppCapabilityViewProps,
} from '@kbn/custom-app-registry';
import { createRunEsqlQuery } from '../data/run_esql_query';
import type { DataLayer } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { toEsqlVariables } from '../data/esql_variables';
import { useSource } from '../data/use_source';
import { useAppRuntime, useStateValues } from '../runtime/app_runtime_context';
import { useActionRunner } from '../actions/use_action_runner';
import { DroppedActions } from '../components/dropped_actions';
import { ACCENT_COLORS } from '../theme/page_theme';
import { usePageAccent } from '../components/app_frame';
import { getServices } from '../services';
import { useSubjectValue } from '../utils/use_subject_value';
import type { CapabilityViewProps, View } from './capability_views';

export type HostView = ComponentType<CustomAppCapabilityViewProps<never>>;
type Inner = HostView;

/** The sources a capability asks for besides its own, which are fetched for as long as it is shown. */
const useExtraSources = (
  layer: DataLayer,
  ids: readonly string[]
): Readonly<Record<string, CapabilitySourceState>> => {
  const key = ids.join('\u0000');
  const [states, setStates] = useState<Readonly<Record<string, CapabilitySourceState>>>({});

  useEffect(() => {
    const wanted = key === '' ? [] : key.split('\u0000');
    const releases = wanted.map((id) => layer.acquire(id));
    const subscription = combineLatest(wanted.map((id) => layer.getSource$(id))).subscribe(
      (values) => setStates(Object.fromEntries(wanted.map((id, index) => [id, values[index]])))
    );
    return () => {
      subscription.unsubscribe();
      releases.forEach((release) => release());
    };
  }, [layer, key]);

  return states;
};

/**
 * Gives the code that draws a capability that a plugin registered what it needs from the app, so
 * that it does not need to know how the app is made.
 */
export const withHostProps =
  (Inner: Inner): View =>
  ({ node, text }: CapabilityViewProps<AppNode>) => {
    const { core, search } = getServices();
    const layer = useDataLayer();
    const runtime = useAppRuntime();
    const state = useStateValues();
    const context = useSubjectValue(layer.context$);
    const run = useMemo(() => createRunEsqlQuery({ search, http: core.http }), [search, core]);
    const runQuery = useCallback(
      (query: string, signal: AbortSignal) => {
        if (!context) return Promise.reject(new Error('The page has not said what to look at yet'));
        return run(query, { context, state }, signal);
      },
      [run, context, state]
    );
    const setValue = useCallback(
      (key: string, value: string) =>
        runtime.run([{ type: 'setState', key, value: { fromInput: true } }], { input: value }),
      [runtime]
    );

    const { colorMode } = useEuiTheme();
    const accent = usePageAccent();
    const accentColor = accent
      ? colorMode === 'DARK'
        ? ACCENT_COLORS[accent].textOnDark
        : ACCENT_COLORS[accent].fill
      : undefined;

    const run$ = useActionRunner(node.id);
    const [dropped, setDropped] = useState<string[]>([]);
    const runActions = useCallback(
      (actions: ReadonlyArray<object>, input?: { row?: Readonly<Record<string, unknown>> }) =>
        setDropped(run$(actions as readonly Action[], input)),
      [run$]
    );

    const extraIds = useMemo(
      () =>
        (
          (
            getCapability(node.type)?.sources as
              | ((n: unknown) => Array<{ suffix: string }>)
              | undefined
          )?.(node) ?? []
        ).map(({ suffix }) => `${node.id}${suffix}`),
      [node]
    );
    const extra = useExtraSources(layer, extraIds);
    const sources = useMemo(
      () =>
        Object.fromEntries(
          Object.entries(extra).map(([id, value]) => [id.slice(node.id.length), value])
        ),
      [extra, node.id]
    );

    const host = {
      text,
      context,
      state,
      esqlVariables: toEsqlVariables(context ?? { esqlVariables: undefined }, state),
      runQuery,
      setValue,
      retry: layer.retry,
      sources,
      accentColor,
      runActions,
    };
    return (
      <>
        {layer.getSourceDefinition(node.id) ? (
          <WithSource Inner={Inner} node={node} host={host} />
        ) : (
          <Inner node={node as never} source={undefined} {...host} />
        )}
        <DroppedActions reasons={dropped} onDismiss={() => setDropped([])} />
      </>
    );
  };

const WithSource = ({
  Inner,
  node,
  host,
}: {
  Inner: Inner;
  node: AppNode;
  host: Omit<CustomAppCapabilityViewProps<never>, 'node' | 'source'>;
}) => {
  const source = useSource(node.id);
  return <Inner node={node as never} source={source} {...host} />;
};
