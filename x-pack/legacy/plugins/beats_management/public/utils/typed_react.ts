/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import React from 'react';
import { InferableComponentEnhancerWithProps } from 'react-redux';

export type RendererResult = React.ReactElement<any> | null;
export type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

export type ChildFunctionRendererProps<RenderArgs> = {
  children: RendererFunction<RenderArgs>;
  initializeOnMount?: boolean;
  resetOnUnmount?: boolean;
} & RenderArgs;

interface ChildFunctionRendererOptions<RenderArgs> {
  onInitialize?: (props: RenderArgs) => void;
  onCleanup?: (props: RenderArgs) => void;
}

export const asChildFunctionRenderer = <InjectedProps, OwnProps>(
  hoc: InferableComponentEnhancerWithProps<InjectedProps, OwnProps>,
  { onInitialize, onCleanup }: ChildFunctionRendererOptions<InjectedProps> = {}
) =>
  hoc(
    class ChildFunctionRenderer extends React.Component<ChildFunctionRendererProps<InjectedProps>> {
      public displayName = 'ChildFunctionRenderer';

      public componentDidMount() {
        if (this.props.initializeOnMount && onInitialize) {
          onInitialize(this.getRendererArgs());
        }
      }

      public componentWillUnmount() {
        if (this.props.resetOnUnmount && onCleanup) {
          onCleanup(this.getRendererArgs());
        }
      }

      public render() {
        return (this.props.children as ChildFunctionRendererProps<InjectedProps>['children'])(
          this.getRendererArgs()
        );
      }

      private getRendererArgs = () =>
        omit(['children', 'initializeOnMount', 'resetOnUnmount'], this.props) as Pick<
          ChildFunctionRendererProps<InjectedProps>,
          keyof InjectedProps
        >;
    }
  );

export type StateUpdater<State, Props = {}> = (
  prevState: Readonly<State>,
  prevProps: Readonly<Props>
) => State | null;

export function composeStateUpdaters<State, Props>(...updaters: Array<StateUpdater<State, Props>>) {
  return (state: State, props: Props) =>
    updaters.reduce((currentState, updater) => updater(currentState, props) || currentState, state);
}
