/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiIcon } from '@elastic/eui';
import React, { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';

import type { CoreStart } from '@kbn/core/public';
import { CustomizeNavigationModal } from '@kbn/core-chrome-navigation';
import { i18n } from '@kbn/i18n';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

export interface CustomizeNavigationMenuItemProps {
  core: CoreStart;
  navigation: NavigationPublicPluginStart;
  closePopover: () => void;
}

export const CustomizeNavigationMenuItem: React.FC<CustomizeNavigationMenuItemProps> = ({
  core,
  navigation,
  closePopover,
}) => {
  const solutionId = useObservable(core.chrome.getActiveSolutionNavId$(), null);

  const handleClick = useCallback(() => {
    if (!solutionId) return;
    closePopover();

    const session = core.overlays.openModal(
      toMountPoint(
        <CustomizeNavigationModal
          solutionId={solutionId}
          onClose={() => session.close()}
          getNavigationPrimaryItems={navigation.getNavigationPrimaryItems}
          setNavigationCustomization={navigation.setNavigationCustomization}
          setIsEditingNavigation={navigation.setIsEditingNavigation}
        />,
        core
      ),
      {
        'data-test-subj': 'customizeNavigationModal',
      }
    );
  }, [solutionId, closePopover, core, navigation]);

  if (!solutionId) {
    return null;
  }

  return (
    <EuiContextMenuItem
      icon={<EuiIcon type="controls" size="m" aria-hidden={true} />}
      size="s"
      onClick={handleClick}
      data-test-subj="customizeNavigationButton"
    >
      {i18n.translate('xpack.security.navControlComponent.customizeNavigationLabel', {
        defaultMessage: 'Customize navigation',
      })}
    </EuiContextMenuItem>
  );
};
