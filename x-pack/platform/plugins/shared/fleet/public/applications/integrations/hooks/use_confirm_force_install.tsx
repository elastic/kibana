/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

import React, { useCallback } from 'react';

import { useStartServices } from '../../fleet/hooks';
import { ConfirmForceInstallModal } from '../components';

const confirmForceInstall = ({
  pkg,
  core,
}: {
  pkg: { name: string; version: string };
  core: CoreStart;
}): Promise<boolean> =>
  new Promise((resolve) => {
    const session = core.overlays.openModal(
      toMountPoint(
        <ConfirmForceInstallModal
          pkg={pkg}
          onConfirm={() => {
            session.close();
            resolve(true);
          }}
          onCancel={() => {
            session.close();
            resolve(false);
          }}
          docLinks={core.docLinks}
        />,
        core
      )
    );
  });

export const useConfirmForceInstall = () => {
  const core = useStartServices();

  return useCallback(
    (pkg: { name: string; version: string }) => confirmForceInstall({ pkg, core }),
    [core]
  );
};
