/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiContextMenuItem, EuiContextMenuPanel, EuiLink, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
interface Props {
  onChange: (visible: boolean) => void;
  disabled?: boolean;
}

interface State {
  isPopoverOpen: boolean;
}

interface ToggleOption {
  id: 'show' | 'hide';
  text: string;
}

const options: ToggleOption[] = [
  {
    id: 'show',
    text: i18n.translate('xpack.spaces.management.showAllFeaturesText', {
      defaultMessage: 'Show all',
    }),
  },
  {
    id: 'hide',
    text: i18n.translate('xpack.spaces.management.hideAllFeaturesText', {
      defaultMessage: 'Hide all',
    }),
  },
];

export class ToggleAllFeatures extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
    const button = (
      <EuiLink onClick={this.onButtonClick} className={'spcToggleAllFeatures__changeAllLink'}>
        <FormattedMessage
          id="xpack.spaces.management.toggleAllFeaturesLink"
          defaultMessage="(change all)"
        />
      </EuiLink>
    );

    const items = options.map(item => {
      return (
        <EuiContextMenuItem
          data-test-subj={`spc-toggle-all-features-${item.id}`}
          key={item.id}
          onClick={() => {
            this.onSelect(item.id);
          }}
          disabled={this.props.disabled}
        >
          {item.text}
        </EuiContextMenuItem>
      );
    });

    return (
      <EuiPopover
        id={'changeAllFeatureVisibilityPopover'}
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }

  private onSelect = (selection: 'show' | 'hide') => {
    this.props.onChange(selection === 'show');
    this.setState({ isPopoverOpen: false });
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };
}
