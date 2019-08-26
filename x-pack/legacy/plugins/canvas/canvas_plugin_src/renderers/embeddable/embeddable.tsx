/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import {
  IEmbeddable,
  EmbeddableFactory,
  EmbeddablePanel,
  EmbeddableFactoryNotFoundError,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { SavedObjectFinder } from '../../../../../../../src/legacy/ui/public/saved_objects/components/saved_object_finder';
import {
  EmbeddableInputToExpressionArgs,
  EmbeddableInputType,
} from './embeddableInputToExpressionArgs';
import { RendererHandlers } from '../../../types';

const embeddablesRegistry: {
  [key: string]: IEmbeddable;
} = {};

const renderEmbeddable = (embeddableObject: IEmbeddable, domNode: HTMLElement) => {
  return (
    <div
      className="embeddable"
      style={{ width: domNode.offsetWidth, height: domNode.offsetHeight, cursor: 'auto' }}
    >
      <I18nContext>
        <EmbeddablePanel
          embeddable={embeddableObject}
          getActions={start.getTriggerCompatibleActions}
          getEmbeddableFactory={start.getEmbeddableFactory}
          getAllEmbeddableFactories={start.getEmbeddableFactories}
          notifications={npStart.core.notifications}
          overlays={npStart.core.overlays}
          inspector={npStart.plugins.inspector}
          SavedObjectFinder={SavedObjectFinder}
        />
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
    { input, embeddableType }: EmbeddableExpression<EmbeddableInputType>,
    handlers: RendererHandlers
  ) => {
    if (!embeddablesRegistry[input.id]) {
      const factory = Array.from(start.getEmbeddableFactories()).find(
        embeddableFactory => embeddableFactory.type === embeddableType
      ) as EmbeddableFactory<EmbeddableInputType>;

      if (!factory) {
        handlers.done();
        throw new EmbeddableFactoryNotFoundError(embeddableType);
      }

      const embeddableObject = await factory.createFromSavedObject(input.id, input);

      embeddablesRegistry[input.id] = embeddableObject;
      ReactDOM.unmountComponentAtNode(domNode);

      const subscription = embeddableObject.getInput$().subscribe(function(updatedInput) {
        handlers.onEmbeddableInputChange(
          EmbeddableInputToExpressionArgs(updatedInput, embeddableType)
        );
      });
      ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () => handlers.done());

      handlers.onResize(() => {
        ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () =>
          handlers.done()
        );
      });

      handlers.onDestroy(() => {
        subscription.unsubscribe();
        // On destroy make one last push of the input, and fetchTheRenderable so that
        // we have the resolvedArg next time we need to render
        handlers.onEmbeddableInputChange(embeddableObject.getInput(), true);
        delete embeddablesRegistry[input.id];

        return ReactDOM.unmountComponentAtNode(domNode);
      });
    } else {
      embeddablesRegistry[input.id].updateInput(input);
    }
  },
});

export { embeddable };
