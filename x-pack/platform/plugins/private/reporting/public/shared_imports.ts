/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FIXME: Reporting code does not consistently import from here. It would be
// better to remove this file and do without indirect imports.
export type { SharePluginSetup, SharePluginStart, LocatorPublic } from '@kbn/share-plugin/public';

export type { UseRequestResponse } from '@kbn/es-ui-shared-plugin/public';
export { useRequest } from '@kbn/es-ui-shared-plugin/public';

export type { SerializableRecord } from '@kbn/utility-types';

export type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';

export type { ManagementAppMountParams } from '@kbn/management-plugin/public';

export type { LicenseCheck } from '@kbn/licensing-plugin/public';
