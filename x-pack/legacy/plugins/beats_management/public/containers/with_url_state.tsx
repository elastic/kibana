/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'querystring';
import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { FlatObject } from '../frontend_types';
import { RendererFunction } from '../utils/typed_react';

type StateCallback<T> = (previousState: T) => T;

export interface URLStateProps<URLState = object> {
  goTo: (path: string) => void;
  setUrlState: (
    newState:
      | Partial<FlatObject<URLState>>
      | StateCallback<URLState>
      | Promise<StateCallback<URLState>>
  ) => void;
  urlState: URLState;
}
interface ComponentProps<URLState extends object> extends RouteComponentProps {
  children: RendererFunction<URLStateProps<URLState>>;
}

export class WithURLStateComponent<URLState extends object> extends React.Component<
  ComponentProps<URLState>
> {
  private get URLState(): URLState {
    // slice because parse does not account for the initial ? in the search string
    return parse(decodeURIComponent(this.props.history.location.search).substring(1)) as URLState;
  }

  private historyListener: (() => void) | null = null;

  public componentWillUnmount() {
    if (this.historyListener) {
      this.historyListener();
    }
  }
  public render() {
    return this.props.children({
      goTo: this.goTo,
      setUrlState: this.setURLState,
      urlState: this.URLState || {},
    });
  }

  private setURLState = async (
    state:
      | Partial<FlatObject<URLState>>
      | StateCallback<URLState>
      | Promise<StateCallback<URLState>>
  ) => {
    let newState;
    const pastState = this.URLState;
    if (typeof state === 'function') {
      newState = await state(pastState);
    } else {
      newState = state;
    }

    const search: string = stringify({
      ...pastState,
      ...newState,
    });

    const newLocation = {
      ...this.props.history.location,
      search,
    };

    this.props.history.replace(newLocation);
    this.forceUpdate();
  };

  private goTo = (path: string) => {
    this.props.history.push({
      pathname: path,
      search: this.props.history.location.search,
    });
  };
}
export const WithURLState = withRouter(WithURLStateComponent);

export function withUrlState<OP>(UnwrappedComponent: React.ComponentType<OP & URLStateProps>) {
  return (origProps: OP) => (
    <WithURLState>
      {(URLProps: URLStateProps) => <UnwrappedComponent {...URLProps} {...origProps} />}
    </WithURLState>
  );
}
