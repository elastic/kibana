/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverProps,
  EuiContextMenu,
} from '@elastic/eui';
import { Refs } from '../../../types';
import { ToolbarSettings } from './toolbar_settings.container';
import { AutoplaySettings } from './autoplay_settings.container';

interface Props {
  refs: Refs;
}

/**
 * The Settings Popover for External Workpads.
 */
export const Settings = ({ refs }: Props) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const button = (
    <EuiButtonIcon
      color="ghost"
      iconType="gear"
      aria-label="Settings"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    />
  );

  const flattenPanelTree = (tree: any, array: any[] = []) => {
    array.push(tree);

    if (tree.items) {
      tree.items.forEach((item: any) => {
        if (item.panel) {
          flattenPanelTree(item.panel, array);
          item.panel = item.panel.id;
        }
      });
    }

    return array;
  };

  const panels = flattenPanelTree({
    id: 0,
    title: 'Settings',
    items: [
      {
        name: 'Auto Play',
        icon: 'play',
        panel: {
          id: 1,
          title: 'Auto Play',
          content: <AutoplaySettings />,
        },
      },
      {
        name: 'Toolbar',
        icon: 'boxesHorizontal',
        panel: {
          id: 2,
          title: 'Toolbar',
          content: <ToolbarSettings onSetAutohide={() => setPopoverOpen(false)} />,
        },
      },
    ],
  });

  const props: EuiPopoverProps = {
    closePopover: () => setPopoverOpen(false),
    isOpen: isPopoverOpen,
    button,
    panelPaddingSize: 'none',
    withTitle: true,
    anchorPosition: 'upRight',
  };

  if (refs.stage.current) {
    props.insert = {
      sibling: refs.stage.current,
      position: 'after',
    };
  }

  return (
    <EuiFlexGroup alignItems="flexEnd" justifyContent="center" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPopover id="settings" {...props}>
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
