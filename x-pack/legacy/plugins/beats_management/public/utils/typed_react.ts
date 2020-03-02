/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export type RendererResult = React.ReactElement<any> | null;
export type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

export type StateUpdater<State, Props = {}> = (
  prevState: Readonly<State>,
  prevProps: Readonly<Props>
) => State | null;

export function composeStateUpdaters<State, Props>(...updaters: Array<StateUpdater<State, Props>>) {
  return (state: State, props: Props) =>
    updaters.reduce((currentState, updater) => updater(currentState, props) || currentState, state);
}
