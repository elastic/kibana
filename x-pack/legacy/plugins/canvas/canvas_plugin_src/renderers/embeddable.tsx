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
  EmbeddablePanel,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddableExpression } from '../expression_types/embeddable';
import { RendererStrings } from '../../i18n';
import {
  SavedObjectFinderProps,
  SavedObjectFinderUi,
} from '../../../../../../src/plugins/kibana_react/public';

const { embeddable: strings } = RendererStrings;

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
    handlers: Handlers
  ) => {
    if (!embeddablesRegistry[input.id]) {
      const factory = Array.from(start.getEmbeddableFactories()).find(
        embeddableFactory => embeddableFactory.type === embeddableType
      );

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
