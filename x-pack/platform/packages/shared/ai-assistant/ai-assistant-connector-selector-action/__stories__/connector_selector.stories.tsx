/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiPopover, EuiContextMenu, EuiButton } from '@elastic/eui';
import type { ConnectorSelectableProps } from '../connector_selectable';
import { ConnectorSelectable as Component } from '../connector_selectable';

const preConfiguredConnectors: ConnectorSelectableProps['preConfiguredConnectors'] = [
  { label: 'Connector 1', value: '1' },
  { label: 'Connector 2', value: '2' },
  { label: 'Connector 3', value: '3' },
];

const customConnectors: ConnectorSelectableProps['customConnectors'] = [
  { label: 'Custom Connector 1', value: '4' },
  { label: 'Custom Connector 2', value: '5' },
  { label: 'Custom Connector 3', value: '6' },
];

export default {
  title: 'Layout/Actions/Connector Selector/Eui Context Menu',
  component: Component,
  args: {
    preConfiguredConnectors,
    customConnectors,
  },
  argTypes: {
    onValueChange: { action: 'onValueChange(value, option)' },
    onAddConnectorClick: { action: 'onAddConnectorClick' },
    onManageConnectorsClick: { action: 'onManageConnectorsClick' },
  },
  decorators: [
    (Story, args) => {
      const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

      const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
      const closePopover = () => setIsPopoverOpen(false);

      const panels: EuiContextMenuPanelDescriptor[] = [
        {
          id: 0,
          title: 'Connectors',
          content: <Story {...args} />,
        },
      ];

      return (
        <EuiPopover
          button={
            <EuiButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
              Click me to load a context menu
            </EuiButton>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      );
    },
  ],
} as Meta<typeof Component>;

// Uncontrolled example (optionally uses defaultValue)
export const UncontrolledContextMenu: StoryFn<typeof Component> = (args) => <Component {...args} />;

UncontrolledContextMenu.args = {
  defaultValue: '2',
  defaultConnectorId: '3',
} as Partial<ConnectorSelectableProps>;

export const ControlledContextMenu: StoryFn<typeof Component> = (args) => {
  const [value, setValue] = React.useState<string | undefined>(
    (args as ConnectorSelectableProps).value
  );

  return (
    <Component
      {...args}
      value={value}
      onValueChange={(newValue, option) => {
        setValue(newValue);
        action('onValueChange')(newValue, option);
      }}
    />
  );
};

ControlledContextMenu.args = {
  value: '3',
  defaultConnectorId: '4',
} as Partial<ConnectorSelectableProps>;
