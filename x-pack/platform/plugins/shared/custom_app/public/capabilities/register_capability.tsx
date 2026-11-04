/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type ComponentType } from 'react';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { AppNode, StateValue } from '@kbn/custom-app-common';
import {
  registerCapability,
  type AnyCapability,
  type CapabilityNodeOf,
} from '@kbn/custom-app-registry';
import { createRunEsqlQuery } from '../data/run_esql_query';
import type { SourceData, SourceState } from '../data/data_layer';
import { useDataLayer } from '../data/data_layer_context';
import { useSource } from '../data/use_source';
import { useAppRuntime, useStateValues } from '../runtime/app_runtime_context';
import { getServices } from '../services';
import { useSubjectValue } from '../utils/use_subject_value';
import { registerCapabilityView, type CapabilityViewProps, type View } from './capability_views';

/** What a query returned: its columns and rows. */
export type CustomAppQueryResult = SourceData;

/** The data of a component, as the app fetches it: loading, what came back, or why it did not. */
export type CustomAppSourceState = SourceState;

/**
 * What the app gives the code that draws a capability that another plugin registered: its node, and
 * what it needs to do what the app does, without knowing how the app is made.
 */
export interface CustomAppCapabilityViewProps<Node> {
  node: Node;
  /** The text of a setting with the values of the app put in. */
  text: (value: string) => string;
  /** The period, filters and query of the page the app is on, which is absent until it is known. */
  context: FetchContext | undefined;
  /** The values of the app. */
  state: Readonly<Record<string, StateValue>>;
  /** Runs an ES|QL query as the person who is looking, with the context and the values of the app. */
  runQuery: (query: string, signal: AbortSignal) => Promise<CustomAppQueryResult>;
  /** Sets a text value of the app. */
  setValue: (key: string, value: string) => void;
  /** The data of the component's own query or source, which the app fetches. Absent when it has none. */
  source: CustomAppSourceState | undefined;
  /** Fetches the data of the app again. */
  retry: () => void;
}

/** A capability that a plugin adds: its manifest, and the code that draws it, loaded when it is first used. */
export interface CustomAppCapability<Manifest> {
  manifest: Manifest;
  view: () => Promise<{
    default: ComponentType<CustomAppCapabilityViewProps<CapabilityNodeOf<Manifest>>>;
  }>;
}

type Inner = ComponentType<CustomAppCapabilityViewProps<never>>;

const withHostProps =
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
    const host = { text, context, state, runQuery, setValue, retry: layer.retry };
    return layer.getSourceDefinition(node.id) ? (
      <WithSource Inner={Inner} node={node} host={host} />
    ) : (
      <Inner node={node as never} source={undefined} {...host} />
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

/** Adds a capability that another plugin provides: its manifest, and how to draw it. */
export const registerCustomAppCapability = <Manifest extends { id: string }>({
  manifest,
  view,
}: CustomAppCapability<Manifest>): void => {
  registerCapability(manifest as unknown as AnyCapability);
  registerCapabilityView(manifest.id, async () => {
    const { default: Inner } = await view();
    return {
      default: withHostProps(
        Inner as unknown as ComponentType<CustomAppCapabilityViewProps<never>>
      ),
    };
  });
};
