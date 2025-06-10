/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLink,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

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

const ToggleButton = ({ onClick }: { onClick: () => void }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiLink
      onClick={onClick}
      css={css`
        margin-left: ${euiTheme.size.s};
      `}
    >
      <FormattedMessage
        id="xpack.spaces.management.toggleAllFeaturesLink"
        defaultMessage="(change all)"
      />
    </EuiLink>
  );
};

export class ToggleAllFeatures extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
    const button = <ToggleButton onClick={this.onButtonClick} />;

    const items = options.map((item) => {
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
        button={button}
        data-test-subj="changeAllFeatureVisibilityPopover"
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
