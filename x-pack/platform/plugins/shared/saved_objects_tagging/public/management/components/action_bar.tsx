/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, FC } from 'react';
import {
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  EuiText,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TagBulkAction } from '../types';

import './_action_bar.scss';

export interface ActionBarProps {
  actions: TagBulkAction[];
  totalCount: number;
  selectedCount: number;
  onActionSelected: (action: TagBulkAction) => void;
}

const actionToMenuItem = (
  action: TagBulkAction,
  onActionSelected: (action: TagBulkAction) => void,
  closePopover: () => void
): EuiContextMenuPanelItemDescriptor => {
  return {
    name: action.label,
    icon: action.icon,
    onClick: () => {
      closePopover();
      onActionSelected(action);
    },
    'data-test-subj': `actionBar-button-${action.id}`,
  };
};

export const ActionBar: FC<ActionBarProps> = ({
  actions,
  onActionSelected,
  selectedCount,
  totalCount,
}) => {
  const [isPopoverOpened, setPopOverOpened] = useState(false);

  const closePopover = useCallback(() => {
    setPopOverOpened(false);
  }, [setPopOverOpened]);

  const togglePopover = useCallback(() => {
    setPopOverOpened((opened) => !opened);
  }, [setPopOverOpened]);

  const contextMenuPanels = useMemo(() => {
    return [
      {
        id: 0,
        items: actions.map((action) => actionToMenuItem(action, onActionSelected, closePopover)),
      },
    ];
  }, [actions, onActionSelected, closePopover]);

  return (
    <div className="tagMgt__actionBar">
      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.actionBar.totalTagsLabel"
              defaultMessage="{count, plural, one {1 tag} other {# tags}}"
              values={{
                count: totalCount,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        {selectedCount > 0 && (
          <>
            <EuiFlexItem grow={false}>
              <div className="tagMgt__actionBarDivider" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isPopoverOpened}
                closePopover={closePopover}
                panelPaddingSize="none"
                button={
                  <EuiText size="xs">
                    <EuiLink onClick={togglePopover} data-test-subj="actionBar-contextMenuButton">
                      <FormattedMessage
                        id="xpack.savedObjectsTagging.management.actionBar.selectedTagsLabel"
                        defaultMessage="{count, plural, one {1 selected tag} other {# selected tags}}"
                        values={{
                          count: selectedCount,
                        }}
                      />
                      <EuiIcon className="tagMgt__actionBarIcon" type="arrowDown" size="s" />
                    </EuiLink>
                  </EuiText>
                }
              >
                <EuiContextMenu
                  initialPanelId={0}
                  panels={contextMenuPanels}
                  data-test-subj="actionBar-contextMenu"
                />
              </EuiPopover>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
};
