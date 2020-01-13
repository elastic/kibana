/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { pure, compose, branch, renderComponent } from 'recompose';
import Style from 'style-it';
import { getType } from '@kbn/interpreter/common';
import { Loading } from '../loading';
import { RenderWithFn } from '../render_with_fn';
import { ElementShareContainer } from '../element_share_container';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';

/*
  Branches
  Short circut rendering of the element if the element isn't ready or isn't valid.
*/
const branches = [
  // no renderable or renderable config value, render loading
  branch(
    ({ renderable, state }) => {
      return !state || !renderable;
    },
    renderComponent(({ backgroundColor }) => <Loading backgroundColor={backgroundColor} />)
  ),

  // renderable is available, but no matching element is found, render invalid
  branch(({ renderable, renderFunction }) => {
    return renderable && getType(renderable) !== 'render' && !renderFunction;
  }, renderComponent(InvalidElementType)),

  // error state, render invalid expression notice
  branch(({ renderable, renderFunction, state }) => {
    return (
      state === 'error' || // The renderable has an error
      getType(renderable) !== 'render' || // The renderable isn't, well, renderable
      !renderFunction // We can't find an element in the registry for this
    );
  }, renderComponent(InvalidExpression)),
];

export const ElementContent = compose(
  pure,
  ...branches
)(({ renderable, renderFunction, size, handlers }) => {
  const {
    getFilter,
    setFilter,
    done,
    onComplete,
    onEmbeddableInputChange,
    onEmbeddableDestroyed,
  } = handlers;

  return Style.it(
    renderable.css,
    <div
      // TODO: 'canvas__element' was added for BWC, It can be removed after a while
      className={'canvas__element canvasElement'}
      style={{ ...renderable.containerStyle, ...size }}
      data-test-subj="canvasWorkpadPageElementContent"
    >
      <ElementShareContainer
        className="canvasElement__content"
        onComplete={onComplete}
        functionName={renderFunction.name}
      >
        <RenderWithFn
          name={renderFunction.name}
          renderFn={renderFunction.render}
          reuseNode={renderFunction.reuseDomNode}
          config={renderable.value}
          css={renderable.css} // This is an actual CSS stylesheet string, it will be scoped by RenderElement
          size={size} // Size is only passed for the purpose of triggering the resize event, it isn't really used otherwise
          handlers={{ getFilter, setFilter, done, onEmbeddableInputChange, onEmbeddableDestroyed }}
        />
      </ElementShareContainer>
    </div>
  );
});

ElementContent.propTypes = {
  renderable: PropTypes.shape({
    css: PropTypes.string,
    value: PropTypes.object,
  }),
  renderFunction: PropTypes.shape({
    name: PropTypes.string,
    render: PropTypes.func,
    reuseDomNode: PropTypes.bool,
  }),
  size: PropTypes.object,
  handlers: PropTypes.shape({
    setFilter: PropTypes.func.isRequired,
    getFilter: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    onComplete: PropTypes.func.isRequired, // local, not passed through
  }).isRequired,
  state: PropTypes.string,
  backgroundColor: PropTypes.string,
};
