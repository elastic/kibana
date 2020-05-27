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
} from '../../../../../../../src/plugins/embeddable/public';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { RendererStrings } from '../../../i18n';
import {
  SavedObjectFinderProps,
  SavedObjectFinderUi,
} from '../../../../../../../src/plugins/kibana_react/public';

const { embeddable: strings } = RendererStrings;
import { embeddableInputToExpression } from './embeddable_input_to_expression';
import { EmbeddableInput } from '../../expression_types';
import { RendererHandlers } from '../../../types';

const embeddablesRegistry: {
  [key: string]: IEmbeddable;
} = {};

const renderEmbeddable = (embeddableObject: IEmbeddable, domNode: HTMLElement) => {
  const SavedObjectFinder = (props: SavedObjectFinderProps) => (
    <SavedObjectFinderUi
      {...props}
      savedObjects={npStart.core.savedObjects}
      uiSettings={npStart.core.uiSettings}
    />
  );
  return (
    <div
      className="embeddable"
      style={{ width: domNode.offsetWidth, height: domNode.offsetHeight, cursor: 'auto' }}
    >
      <I18nContext>
        <EmbeddablePanel
          embeddable={embeddableObject}
          getActions={npStart.plugins.uiActions.getTriggerCompatibleActions}
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
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (
    domNode: HTMLElement,
    { input, embeddableType }: EmbeddableExpression<EmbeddableInput>,
    handlers: RendererHandlers
  ) => {
    const uniqueId = handlers.getElementId();

    if (!embeddablesRegistry[uniqueId]) {
      const factory = Array.from(start.getEmbeddableFactories()).find(
        embeddableFactory => embeddableFactory.type === embeddableType
      ) as EmbeddableFactory<EmbeddableInput>;

      if (!factory) {
        handlers.done();
        throw new EmbeddableFactoryNotFoundError(embeddableType);
      }

      const embeddableObject = await factory.createFromSavedObject(input.id, input);

      embeddablesRegistry[uniqueId] = embeddableObject;
      ReactDOM.unmountComponentAtNode(domNode);

      const subscription = embeddableObject.getInput$().subscribe(function(updatedInput) {
        handlers.onEmbeddableInputChange(embeddableInputToExpression(updatedInput, embeddableType));
      });
      ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () => handlers.done());

      handlers.onResize(() => {
        ReactDOM.render(renderEmbeddable(embeddableObject, domNode), domNode, () =>
          handlers.done()
        );
      });

      handlers.onDestroy(() => {
        subscription.unsubscribe();
        handlers.onEmbeddableDestroyed();

        delete embeddablesRegistry[uniqueId];

        return ReactDOM.unmountComponentAtNode(domNode);
      });
    } else {
      embeddablesRegistry[uniqueId].updateInput(input);
      embeddablesRegistry[uniqueId].reload();
    }
  },
});

export { embeddable };
