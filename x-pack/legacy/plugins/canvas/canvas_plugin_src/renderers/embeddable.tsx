/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
import {
  IEmbeddable,
  EmbeddablePanel,
  embeddableFactories,
  EmbeddableInput,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public';

import { EmbeddableFactoryNotFoundError } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/embeddables';

import { EmbeddableExpression } from '../expression_types/embeddable';

const embeddablesRegistry: {
  [key: string]: IEmbeddable;
} = {};

interface Handlers {
  setFilter: (text: string) => void;
  getFilter: () => string | null;
  done: () => void;
  onResize: (fn: () => void) => void;
  onDestroy: (fn: () => void) => void;
}

const renderEmbeddable = (embeddableObject: IEmbeddable, domNode: HTMLElement) => {
  return (
    <div
      className="embeddable"
      style={{ width: domNode.offsetWidth, height: domNode.offsetHeight, cursor: 'auto' }}
    >
      <I18nContext>
        <EmbeddablePanel embeddable={embeddableObject} />
      </I18nContext>
    </div>
  );
};

const embeddable = () => ({
  name: 'embeddable',
  displayName: 'embeddable',
  help: 'embeddable',
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    { input, embeddableType }: EmbeddableExpression<EmbeddableInput>,
    handlers: Handlers
  ) => {
    if (!embeddablesRegistry[input.id]) {
      const factory = embeddableFactories.get(embeddableType);

      if (!factory) {
        handlers.done();
        throw new EmbeddableFactoryNotFoundError(embeddableType);
      }

      const embeddableObject = await factory.createFromSavedObject(input.id, input);
      embeddablesRegistry[input.id] = embeddableObject;

      ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () => handlers.done());

      handlers.onResize(() => {
        ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () =>
          handlers.done()
        );
      });

      handlers.onDestroy(() => {
        delete embeddablesRegistry[input.id];
        return ReactDOM.unmountComponentAtNode(domNode);
      });
    } else {
      embeddablesRegistry[input.id].updateInput(input);
    }
  },
});

export { embeddable };
