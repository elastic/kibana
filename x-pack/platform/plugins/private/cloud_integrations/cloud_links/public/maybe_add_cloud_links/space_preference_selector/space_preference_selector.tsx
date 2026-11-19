/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { UserProfilesKibanaProvider } from '@kbn/user-profile-components';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { useUpdateUserProfile } from '@kbn/user-profile-components';
import { SpacesPreferencesModal } from './spaces_preference_modal';

interface SpaceConfigurationProps {
  closePopover: () => void;
  security: SecurityPluginStart;
  core: CoreStart;
}

export function SpaceConfigurationSelector({
  security,
  core,
  closePopover,
}: SpaceConfigurationProps) {
  return (
    <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
      <SpaceConfigurationUI closePopover={closePopover} core={core} security={security} />
    </UserProfilesKibanaProvider>
  );
}

export function SpaceConfigurationUI({
  core,
  security,
  closePopover,
}: Pick<SpaceConfigurationProps, 'closePopover' | 'core' | 'security'>) {
  const {
    userProfileData,
    update: updateUserProfile,
    userProfileLoaded,
  } = useUpdateUserProfile({});

  const modalRef = useRef<OverlayRef | null>(null);

  const closeModal = () => {
    modalRef.current?.close();
    modalRef.current = null;
  };

  const userProfile = useMemo(() => {
    return userProfileData && userProfileLoaded ? userProfileData : null;
  }, [userProfileData, userProfileLoaded]);

  const openModal = () => {
    modalRef.current = core.overlays.openModal(
      toMountPoint(
        React.createElement(function ModalWrapper() {
          return (
            <SpacesPreferencesModal
              closeModal={closeModal}
              userProfile={userProfile!}
              updateUserProfile={updateUserProfile}
            />
          );
        }),
        core
      ),
      { 'data-test-subj': 'spaceConfigurationModal', maxWidth: 600 }
    );
  };

  if (!userProfile) {
    return null;
  }

  return (
    <EuiContextMenuItem
      icon="spaces"
      onClick={() => {
        openModal();
        closePopover();
      }}
      data-test-subj="spacePreferenceSelector"
    >
      {i18n.translate('xpack.cloudLinks.userMenuLinks.spaceConfigurationLinkText', {
        defaultMessage: 'Spaces preferences',
      })}
    </EuiContextMenuItem>
  );
}
