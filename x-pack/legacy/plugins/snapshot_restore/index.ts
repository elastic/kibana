/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { Plugin as SnapshotRestorePlugin } from './plugin';
import { createShim } from './shim';

export function snapshotRestore(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.snapshot_restore',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      managementSections: ['plugins/snapshot_restore'],
    },
    init(server: Legacy.Server) {
      const { core, plugins } = createShim(server, PLUGIN.ID);
      const { i18n } = core;
      const snapshotRestorePlugin = new SnapshotRestorePlugin();

      // Start plugin
      snapshotRestorePlugin.start(core, plugins);

      // Register license checker
      plugins.license.registerLicenseChecker(
        server,
        PLUGIN.ID,
        PLUGIN.getI18nName(i18n),
        PLUGIN.MINIMUM_LICENSE_REQUIRED
      );
    },
  });
}
