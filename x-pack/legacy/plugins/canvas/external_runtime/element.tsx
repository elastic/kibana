/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore Untyped library
import Style from 'style-it';
import { CanvasElement } from './types';
// @ts-ignore Untyped local
import { Positionable } from '../public/components/positionable/positionable';
// @ts-ignore Untyped local
import { elementToShape } from '../public/components/workpad_page/utils';
import { StateContext } from './state';
interface Props {
  element: CanvasElement;
}

export class ExternalEmbedElement extends React.PureComponent<Props> {
  static contextType = StateContext;
  protected ref: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.ref = React.createRef();
  }

  componentDidMount() {
    const [{ renderersRegistry }] = this.context;
    const { element } = this.props;
    const { expressionRenderable } = element;
    const { value } = expressionRenderable;
    const { as } = value;
    const fn = renderersRegistry.get(as);

    try {
      fn.render(this.ref.current, value.value, {
        done: () => {},
        onDestroy: () => {},
        onResize: () => {},
        setFilter: () => {},
        getFilter: () => {},
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e.message);
    }
  }

  render() {
    const { element } = this.props;
    const shape = elementToShape(element, 1);
    const { id, expressionRenderable, position } = element;
    const { value } = expressionRenderable;
    const { as, css, containerStyle } = value;
    const { height, width } = position;
    return (
      <Positionable height={height} width={width} transformMatrix={shape.transformMatrix}>
        <div style={{ height: '100%', width: '100%' }}>
          {Style.it(
            css,
            <div className={'canvas__element canvasElement'} style={{ ...containerStyle }}>
              <div className="canvasElement__content">
                <div className="canvasWorkpad--element_render canvasRenderEl">
                  <div
                    key={id}
                    ref={this.ref}
                    data-renderer={as}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Positionable>
    );
  }
}
