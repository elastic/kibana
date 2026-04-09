/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { UserProfilesKibanaProvider } from '@kbn/user-profile-components';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

import { AppearanceModal } from './appearance_modal';

interface OpenAppearanceModalParams {
  core: CoreStart;
  security: SecurityPluginStart;
  isServerless: boolean;
}

let appearanceModalRef: OverlayRef | null = null;

export const openAppearanceModal = ({
  core,
  security,
  isServerless,
}: OpenAppearanceModalParams) => {
  if (appearanceModalRef) {
    return;
  }

  const closeModal = () => {
    appearanceModalRef?.close();
    appearanceModalRef = null;
  };

  appearanceModalRef = core.overlays.openModal(
    toMountPoint(
      <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
        <AppearanceModal
          closeModal={closeModal}
          uiSettingsClient={core.uiSettings}
          isServerless={isServerless}
        />
      </UserProfilesKibanaProvider>,
      core
    ),
    { 'data-test-subj': 'appearanceModal', maxWidth: 600 }
  );
};
