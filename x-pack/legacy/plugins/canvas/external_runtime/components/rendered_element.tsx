/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore Untyped library
import Style from 'style-it';
// @ts-ignore Untyped local
import { Positionable } from '../../public/components/positionable/positionable';
// @ts-ignore Untyped local
import { elementToShape } from '../../public/components/workpad_page/utils';
import { CanvasRenderedElement } from '../types';
import { ExternalEmbedContext } from '../context';

// @ts-ignore CSS Module
import css from './rendered_element.module';

interface Props {
  element: CanvasRenderedElement;
  number?: number;
}

/**
 * A Rendered Element is different from an Element added to a Canvas Workpad.  A
 * Rendered Element has actually be evaluated already to gather any data from
 * datasources, and is just a simple expression to render the result.  This
 * component renders that "transient" element state.
 */
export class RenderedElement extends React.PureComponent<Props> {
  static contextType = ExternalEmbedContext;
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
      // TODO: These are stubbed, but may need implementation.
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
    const { element, number } = this.props;
    const shape = elementToShape(element, number || 1);
    const { id, expressionRenderable, position } = element;
    const { value } = expressionRenderable;
    const { as, css: elementCSS, containerStyle } = value;
    const { height, width } = position;

    return (
      <Positionable height={height} width={width} transformMatrix={shape.transformMatrix}>
        <div className={css.root}>
          {Style.it(
            elementCSS,
            <div className={css.container} style={{ ...containerStyle }}>
              <div className={css.content}>
                <div className={css.renderContainer}>
                  <div key={id} ref={this.ref} data-renderer={as} className={css.render} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Positionable>
    );
  }
}
