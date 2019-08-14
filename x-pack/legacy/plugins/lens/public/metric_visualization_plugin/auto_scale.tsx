/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { EuiResizeObserver } from '@elastic/eui';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode | React.ReactNode[];
}

interface State {
  scale: number;
}

export class AutoScale extends React.Component<Props, State> {
  private child: Element | null = null;
  private parent: Element | null = null;
  private scale: () => void;

  constructor(props: Props) {
    super(props);

    this.scale = _.throttle(() => {
      const scale = computeScale(this.parent, this.child);

      // Prevent an infinite render loop
      if (this.state.scale !== scale) {
        this.setState({ scale });
      }
    });

    // An initial scale of 0 means we always redraw
    // at least once, which is sub-optimal, but it
    // prevents an annoying flicker.
    this.state = { scale: 0 };
  }

  setParent = (el: Element | null) => {
    if (this.parent !== el) {
      this.parent = el;
      setTimeout(() => this.scale());
    }
  };

  setChild = (el: Element | null) => {
    if (this.child !== el) {
      this.child = el;
      setTimeout(() => this.scale());
    }
  };

  render() {
    const { children } = this.props;
    const { scale } = this.state;
    const style = this.props.style || {};

    return (
      <EuiResizeObserver onResize={this.scale}>
        {resizeRef => (
          <div
            {...this.props}
            ref={el => {
              this.setParent(el);
              resizeRef(el);
            }}
            style={{
              ...style,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <div
              ref={this.setChild}
              style={{
                transform: `scale(${scale})`,
                // When we do a transform scale, it leaves a lot of
                // white space above and below the element, so we pull
                // that in with negative margins.
                marginBottom: `-${(1 - scale) / 2}em`,
              }}
            >
              {children}
            </div>
          </div>
        )}
      </EuiResizeObserver>
    );
  }
}

interface ClientDimensionable {
  clientWidth: number;
  clientHeight: number;
}

/**
 * computeScale computes the ratio by which the child needs to shrink in order
 * to fit into the parent. This function is only exported for testing purposes.
 */
export function computeScale(
  parent: ClientDimensionable | null,
  child: ClientDimensionable | null
) {
  if (!parent || !child) {
    return 1;
  }

  const scaleX = parent.clientWidth / child.clientWidth;
  const scaleY = parent.clientHeight / child.clientHeight;

  return Math.min(1, Math.min(scaleX, scaleY));
}
