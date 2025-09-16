/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { OnechatInternalService } from './services';
import type { OnechatServicesContext } from './application/context/onechat_services_context';
import type { ContentReferenceRegistry } from './application/components/conversations/content_reference/content_reference_registry';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface OnechatSetupDependencies {
  spaces: SpacesPluginSetup;
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  discover: DiscoverSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
}

export interface OnechatStartDependencies {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  spaces: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  discover: DiscoverStart;
  cloud: CloudStart;
  share: SharePluginStart;
}

export interface OnechatPluginSetup {}

export interface OnechatPluginStart {
  internalServices: OnechatInternalService;
  contentReferenceRegistry: ContentReferenceRegistry;
}

export type { OnechatServicesContext };
