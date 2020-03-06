/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
// @ts-ignore unconverted lib
import { getState } from '../../../public/state/store';
import {
  IEmbeddable,
  EmbeddableFactory,
  EmbeddablePanel,
  EmbeddableFactoryNotFoundError,
  ViewMode,
} from '../../../../../../../src/plugins/embeddable/public';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { RendererStrings } from '../../../i18n';
import { getSavedObjectFinder } from '../../../../../../../src/plugins/saved_objects/public';
import { embeddableInputToExpression } from './embeddable_input_to_expression';
import { EmbeddableInput } from '../../expression_types';
import { RendererHandlers } from '../../../types';
import { canUserWrite, getFullscreen } from '../../../public/state/selectors/app';
import { isWriteable } from '../../../public/state/selectors/workpad';

const { embeddable: strings } = RendererStrings;

// TODO: can we import the const from the drilldown x-pack plugin? Imports seem to be restricted
const OPEN_FLYOUT_ADD_DRILLDOWN = 'OPEN_FLYOUT_ADD_DRILLDOWN';

const embeddablesRegistry: {
  [key: string]: IEmbeddable;
} = {};

const renderEmbeddable = (embeddableObject: IEmbeddable, domNode: HTMLElement) => {
  return (
    <div
      className="canvasEmbeddable"
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
          SavedObjectFinder={getSavedObjectFinder(
            npStart.core.savedObjects,
            npStart.core.uiSettings
          )}
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

    const appState = getState();
    const isEditable = isWriteable(appState) && canUserWrite(appState) && !getFullscreen(appState);

    input.viewMode = isEditable ? ViewMode.EDIT : ViewMode.VIEW;

    if (isEditable) {
      input.viewMode = ViewMode.EDIT;
    } else {
      input.viewMode = ViewMode.VIEW;
      // Disables the Create Drilldown action
      input.disabledActions = get<EmbeddableInput, string[]>(input, 'disabledActions', []).concat(
        OPEN_FLYOUT_ADD_DRILLDOWN
      );
    }

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
    }
  },
});

export { embeddable };
