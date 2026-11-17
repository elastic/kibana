/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { Observable } from 'rxjs';
import type { IconType } from '@elastic/eui';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { FleetStart } from '../plugin';
import type {
  CloseAddIntegrationModal,
  OpenAddIntegrationModalOptions,
} from './add_integration_modal/types';

export interface IngestFlow {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  category: string;
  order?: number;
  component: ComponentType;
}

export interface IngestHubStartDependencies {
  spaces?: SpacesPluginStart;
  cloud?: CloudStart;
  fleet: FleetStart;
}

export type IngestHubSetup = Record<string, never>;

export interface IngestHubStart {
  registerIngestFlow: (flow: IngestFlow) => void;
  navigationAvailable$: Observable<boolean>;
  /**
   * Opens the Add integration experience in a modal owned by Fleet.
   *
   * A function rather than a component on purpose: a component would make the Integrations app
   * reachable from the consuming bundle's entry graph, which the optimizer then promotes into the
   * shared page-load bundles. Here the experience stays in a Fleet async chunk.
   */
  openAddIntegrationModal: (
    options?: OpenAddIntegrationModalOptions
  ) => Promise<CloseAddIntegrationModal>;
}
