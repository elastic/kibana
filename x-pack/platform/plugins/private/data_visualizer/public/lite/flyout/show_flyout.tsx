/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { createFlyout } from './create_flyout';
import type { OpenFileUploadLiteContext } from '../../register_ui_actions';

export async function showFlyout(
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  props: OpenFileUploadLiteContext
): Promise<void> {
  return createFlyout(coreStart, share, data, props);
}
