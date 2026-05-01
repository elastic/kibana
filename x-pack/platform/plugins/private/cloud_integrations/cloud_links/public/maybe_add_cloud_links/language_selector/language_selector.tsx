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
import { LanguageModal } from './language_modal';

interface OpenLanguageModalParams {
  core: CoreStart;
  security: SecurityPluginStart;
}

let languageModalRef: OverlayRef | null = null;

export const openLanguageModal = ({ core, security }: OpenLanguageModalParams) => {
  if (languageModalRef) {
    return;
  }

  const closeModal = () => {
    languageModalRef?.close();
    languageModalRef = null;
  };

  languageModalRef = core.overlays.openModal(
    toMountPoint(
      <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
        <LanguageModal closeModal={closeModal} />
      </UserProfilesKibanaProvider>,
      core
    ),
    { 'data-test-subj': 'languageModal', maxWidth: 500 }
  );
};
