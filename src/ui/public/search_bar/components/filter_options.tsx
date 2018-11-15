/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { Component } from 'react';
import React from 'react';

interface Props {
  onAction: (action: string) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class FilterOptions extends Component<Props, State> {
  public state: State = {
    isPopoverOpen: false,
  };

  public togglePopover = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  public closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  public render() {
    const panelTree = {
      id: 0,
      items: [
        {
          name: 'Enable all',
          icon: 'eye',
          onClick: () => {
            this.closePopover();
            this.props.onAction('enable');
          },
        },
        {
          name: 'Disable all',
          icon: 'eyeClosed',
          onClick: () => {
            this.closePopover();
            this.props.onAction('disable');
          },
        },
        {
          name: 'Pin all',
          icon: 'pin',
          onClick: () => {
            this.closePopover();
            this.props.onAction('pin');
          },
        },
        {
          name: 'Unpin all',
          icon: 'pin',
          onClick: () => {
            this.closePopover();
            this.props.onAction('unpin');
          },
        },
        {
          name: 'Invert inclusion',
          icon: 'invert',
          onClick: () => {
            this.closePopover();
            this.props.onAction('toggleNegate');
          },
        },
        {
          name: 'Invert enabled/disabled',
          icon: 'eye',
          onClick: () => {
            this.closePopover();
            this.props.onAction('toggleDisabled');
          },
        },
        {
          name: 'Remove all',
          icon: 'trash',
          onClick: () => {
            this.closePopover();
            this.props.onAction('delete');
          },
        },
      ],
    };

    return (
      <EuiPopover
        id="popoverForAllFilters"
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        button={
          <EuiButtonIcon
            onClick={this.togglePopover}
            color="text"
            iconType="gear"
            aria-label="Change all filters"
            title="Change all filters"
          />
        }
        anchorPosition="downCenter"
        panelPaddingSize="none"
        withTitle
      >
        <EuiPopoverTitle>Change all filters</EuiPopoverTitle>
        <EuiContextMenu initialPanelId={0} panels={[panelTree]} />
      </EuiPopover>
    );
  }
}
