/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { InternalCoreStart } from 'src/core/public';
import { start } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { SavedObjectFinder } from '../../../../../../src/legacy/ui/public/saved_objects/components/saved_object_finder';
import { PluginsStart } from 'ui/new_platform/new_platform';
import {
  // EmbeddablePanel,
  GetActionsCompatibleWithTrigger,
  GetEmbeddableFactory,
  GetEmbeddableFactories
} from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { CoreStart } from '../../../../../../src/core/public';
import { Start as InspectorStartContract } from '../../../../../../src/plugins/inspector/public';

interface EmbeddablePanelProps {
  getActions: GetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
}
const EmbeddableContext = createContext<EmbeddablePanelProps>(
  {} as EmbeddablePanelProps
);
const EmbeddableProvider: React.SFC<{
  core: InternalCoreStart;
  plugins: PluginsStart;
}> = props => {
  const { core, plugins, ...restProps } = props;
  const embeddablePanelProps: EmbeddablePanelProps = {
    getActions: start.getTriggerCompatibleActions,
    getAllEmbeddableFactories: start.getEmbeddableFactories,
    getEmbeddableFactory: start.getEmbeddableFactory,
    notifications: core.notifications,
    overlays: core.overlays,
    inspector: plugins.inspector,
    SavedObjectFinder
  };
  return (
    <EmbeddableContext.Provider value={embeddablePanelProps} {...restProps} />
  );
};

export { EmbeddableContext, EmbeddableProvider };
