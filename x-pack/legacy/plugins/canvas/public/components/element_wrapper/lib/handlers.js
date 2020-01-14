/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { setFilter } from '../../../state/actions/elements';
import {
  updateEmbeddableExpression,
  fetchEmbeddableRenderable,
} from '../../../state/actions/embeddable';

export const createHandlers = dispatch => {
  let isComplete = false;
  let oldElement;
  let completeFn = () => {};

  return (element, pageId) => {
    // reset isComplete when element changes
    if (!isEqual(oldElement, element)) {
      isComplete = false;
      oldElement = element;
    }

    return {
      setFilter(text) {
        dispatch(setFilter(text, element.id, pageId, true));
      },

      getFilter() {
        return element.filter;
      },

      onComplete(fn) {
        completeFn = fn;
      },

      onEmbeddableInputChange(embeddableExpression) {
        dispatch(updateEmbeddableExpression({ elementId: element.id, embeddableExpression }));
      },

      onEmbeddableDestroyed() {
        dispatch(fetchEmbeddableRenderable(element.id));
      },

      done() {
        // don't emit if the element is already done
        if (isComplete) {
          return;
        }

        isComplete = true;
        completeFn();
      },
    };
  };
};
