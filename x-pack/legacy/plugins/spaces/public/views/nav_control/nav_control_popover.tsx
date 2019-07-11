/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiPopover, PopoverAnchorPosition } from '@elastic/eui';
import React, { Component, ComponentClass } from 'react';
import { Capabilities } from 'src/core/public';
import { Space } from '../../../common/model/space';
import { SpaceAvatar } from '../../components';
import { SpacesManager } from '../../lib/spaces_manager';
import { SpacesDescription } from './components/spaces_description';
import { SpacesMenu } from './components/spaces_menu';
import { ButtonProps } from './types';

interface Props {
  spacesManager: SpacesManager;
  anchorPosition: PopoverAnchorPosition;
  buttonClass: ComponentClass<ButtonProps>;
  capabilities: Capabilities;
}

interface State {
  showSpaceSelector: boolean;
  loading: boolean;
  activeSpace: Space | null;
  spaces: Space[];
}

export class NavControlPopover extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showSpaceSelector: false,
      loading: false,
      activeSpace: null,
      spaces: [],
    };
  }

  public componentDidMount() {
    this.loadSpaces();

    if (this.props.spacesManager) {
      this.props.spacesManager.on('request_refresh', () => {
        this.loadSpaces(true);
      });
    }
  }

  public render() {
    const button = this.getActiveSpaceButton();
    if (!button) {
      return null;
    }

    let element: React.ReactNode;
    if (this.state.spaces.length < 2) {
      element = (
        <SpacesDescription
          onManageSpacesClick={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
        />
      );
    } else {
      element = (
        <SpacesMenu
          spaces={this.state.spaces}
          onSelectSpace={this.onSelectSpace}
          onManageSpacesClick={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
        />
      );
    }

    return (
      // @ts-ignore repositionOnScroll doesn't exist on EuiPopover
      <EuiPopover
        id={'spcMenuPopover'}
        data-test-subj={`spacesNavSelector`}
        button={button}
        isOpen={this.state.showSpaceSelector}
        closePopover={this.closeSpaceSelector}
        anchorPosition={this.props.anchorPosition}
        panelPaddingSize="none"
        repositionOnScroll={true}
        withTitle={this.props.anchorPosition.includes('down')}
        ownFocus
      >
        {element}
      </EuiPopover>
    );
  }

  private async loadSpaces(refreshActiveSpace: boolean = false) {
    const { spacesManager } = this.props;

    this.setState({
      loading: true,
    });

    const [activeSpace, spaces] = await Promise.all([
      spacesManager.getActiveSpace(refreshActiveSpace),
      spacesManager.getSpaces(),
    ]);

    this.setState({
      spaces,
      activeSpace,
      loading: false,
    });
  }

  private getActiveSpaceButton = () => {
    const { activeSpace } = this.state;

    if (!activeSpace) {
      return this.getButton(
        <EuiAvatar size={'s'} className={'spaceNavGraphic'} name={'...'} />,
        'loading'
      );
    }

    return this.getButton(
      <SpaceAvatar space={activeSpace} size={'s'} className={'spaceNavGraphic'} />,
      (activeSpace as Space).name
    );
  };

  private getButton = (linkIcon: JSX.Element, linkTitle: string) => {
    const Button = this.props.buttonClass;
    return (
      <Button
        linkTitle={linkTitle}
        linkIcon={linkIcon}
        toggleSpaceSelector={this.toggleSpaceSelector}
        spaceSelectorShown={this.state.showSpaceSelector}
      />
    );
  };

  private toggleSpaceSelector = () => {
    const isOpening = !this.state.showSpaceSelector;
    if (isOpening) {
      this.loadSpaces();
    }

    this.setState({
      showSpaceSelector: !this.state.showSpaceSelector,
    });
  };

  private closeSpaceSelector = () => {
    this.setState({
      showSpaceSelector: false,
    });
  };

  private onSelectSpace = (space: Space) => {
    this.props.spacesManager.changeSelectedSpace(space);
  };
}
