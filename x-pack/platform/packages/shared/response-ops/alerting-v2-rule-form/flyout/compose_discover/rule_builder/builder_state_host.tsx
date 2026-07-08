/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { BuilderStateProvider } from './builder_state_context';
import { resolveInitialBuilderState } from './resolve_initial_state';
import type { BuilderState } from './types';

export interface ComposeDiscoverBuilderStateHostProps {
  builderType?: string;
  initialBuilderState?: BuilderState;
  initialQuery?: string;
  esqlVariables?: ESQLControlVariable[];
  children: (parsedFromDiscover: boolean) => React.ReactNode;
}

/**
 * Resolves what builderState should start as, owns it for the lifetime of one
 * ComposeDiscoverFlyout session, and wraps children in the BuilderStateProvider the
 * flyout reads from — replacing the useState/Provider the flyout used to own internally.
 * Mount this fresh each time a flyout session starts (e.g. inside the same conditional
 * that mounts ComposeDiscoverFlyout) so builder state resets between sessions the same
 * way the flyout's own local state used to when it fully unmounted/remounted.
 */
export const ComposeDiscoverBuilderStateHost = ({
  builderType,
  initialBuilderState,
  initialQuery,
  esqlVariables,
  children,
}: ComposeDiscoverBuilderStateHostProps): React.ReactElement => {
  const [{ builderState: initial, parsedFromDiscover }] = useState(() =>
    resolveInitialBuilderState(builderType, { initialBuilderState, initialQuery, esqlVariables })
  );
  const [builderState, setBuilderState] = useState<BuilderState>(initial);

  return (
    <BuilderStateProvider builderState={builderState} setBuilderState={setBuilderState}>
      {children(parsedFromDiscover)}
    </BuilderStateProvider>
  );
};
