/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { useConfigureCasesNavigation } from '../../../../../common/navigation/hooks';
import * as redesignI18n from '../../../translations';
import { SidebarSectionSettingsButton } from './sidebar_section_settings_button';

export interface ConnectorSettingsPopoverProps {
  'data-test-subj'?: string;
}

export const ConnectorSettingsPopover: FC<ConnectorSettingsPopoverProps> = ({
  'data-test-subj': dataTestSubj = 'sidebar-connector-settings',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { navigateToConfigureCases } = useConfigureCasesNavigation();

  const onAddConnectorClick = useCallback(() => {
    closePopover();
    navigateToConfigureCases();
  }, [closePopover, navigateToConfigureCases]);

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="add-connector"
        data-test-subj={`${dataTestSubj}-add-connector`}
        onClick={onAddConnectorClick}
      >
        {redesignI18n.ADD_CONNECTOR}
      </EuiContextMenuItem>,
    ],
    [dataTestSubj, onAddConnectorClick]
  );

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="none"
      data-test-subj={`${dataTestSubj}-popover`}
      button={
        <SidebarSectionSettingsButton data-test-subj={dataTestSubj} onClick={togglePopover} />
      }
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

ConnectorSettingsPopover.displayName = 'ConnectorSettingsPopover';
