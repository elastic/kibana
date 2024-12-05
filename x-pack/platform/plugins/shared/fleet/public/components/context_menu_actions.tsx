/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiPopover,
  EuiButton,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiButtonProps } from '@elastic/eui/src/components/button/button';
import type { EuiContextMenuProps } from '@elastic/eui/src/components/context_menu/context_menu';
import type { EuiContextMenuPanelProps } from '@elastic/eui/src/components/context_menu/context_menu_panel';

type Props = {
  button?: {
    props: EuiButtonProps;
    children: JSX.Element;
  };
  isOpen?: boolean;
  isManaged?: boolean;
  onChange?: (isOpen: boolean) => void;
} & (
  | {
      items: EuiContextMenuPanelProps['items'];
    }
  | {
      panels: EuiContextMenuProps['panels'];
    }
);

export const ContextMenuActions = React.memo<Props>(({ button, onChange, isOpen, ...props }) => {
  const [isOpenState, setIsOpenState] = useState(false);
  const handleCloseMenu = useCallback(() => {
    if (onChange) {
      onChange(false);
    } else {
      setIsOpenState(false);
    }
  }, [setIsOpenState, onChange]);
  const handleToggleMenu = useCallback(() => {
    if (onChange) {
      onChange(!isOpen);
    } else {
      setIsOpenState(!isOpenState);
    }
  }, [isOpenState, onChange, isOpen]);

  const actionButton = button ? (
    <EuiButton {...button.props} onClick={handleToggleMenu} isDisabled={props.isManaged}>
      {button.children}
    </EuiButton>
  ) : (
    <EuiButtonIcon
      isDisabled={props.isManaged}
      iconType="boxesHorizontal"
      onClick={handleToggleMenu}
      aria-label={i18n.translate('xpack.fleet.genericActionsMenuText', {
        defaultMessage: 'Open',
      })}
      data-test-subj="agentActionsBtn"
    />
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        props.isManaged ? (
          <EuiToolTip
            title={i18n.translate('xpack.fleet.externallyManagedLabel', {
              defaultMessage: 'This is externally managed integration policy.',
            })}
          >
            {actionButton}
          </EuiToolTip>
        ) : (
          actionButton
        )
      }
      isOpen={isOpen === undefined ? isOpenState : isOpen}
      closePopover={handleCloseMenu}
    >
      {'items' in props ? (
        <EuiContextMenuPanel items={props.items} />
      ) : (
        <EuiContextMenu panels={props.panels} initialPanelId={0} />
      )}
    </EuiPopover>
  );
});
