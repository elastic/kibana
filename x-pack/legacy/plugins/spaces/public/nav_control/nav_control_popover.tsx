/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPopover,
  PopoverAnchorPosition,
  EuiLoadingSpinner,
  EuiHeaderSectionItemButton,
} from '@elastic/eui';
import React, { Component } from 'react';
import { Capabilities } from 'src/core/public';
import { Subscription } from 'rxjs';
import { Space } from '../../common/model/space';
import { SpaceAvatar } from '../space_avatar';
import { SpacesManager } from '../spaces_manager';
import { SpacesDescription } from './components/spaces_description';
import { SpacesMenu } from './components/spaces_menu';

interface Props {
  spacesManager: SpacesManager;
  anchorPosition: PopoverAnchorPosition;
  capabilities: Capabilities;
}

interface State {
  showSpaceSelector: boolean;
  loading: boolean;
  activeSpace: Space | null;
  spaces: Space[];
}

export class NavControlPopover extends Component<Props, State> {
  private activeSpace$?: Subscription;

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
    this.activeSpace$ = this.props.spacesManager.onActiveSpaceChange$.subscribe({
      next: activeSpace => {
        this.setState({
          activeSpace,
        });
      },
    });
  }

  public componentWillUnmount() {
    if (this.activeSpace$) {
      this.activeSpace$.unsubscribe();
    }
  }

  public render() {
    const button = this.getActiveSpaceButton();
    if (!button) {
      return null;
    }

    let element: React.ReactNode;
    if (!this.state.loading && this.state.spaces.length < 2) {
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
          isLoading={this.state.loading}
          onSelectSpace={this.onSelectSpace}
          onManageSpacesClick={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
        />
      );
    }

    return (
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

  private async loadSpaces() {
    const { spacesManager } = this.props;

    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: true,
    });

    const spaces = await spacesManager.getSpaces();

    this.setState({
      spaces,
      loading: false,
    });
  }

  private getActiveSpaceButton = () => {
    const { activeSpace } = this.state;

    if (!activeSpace) {
      return this.getButton(<EuiLoadingSpinner size="m" />, 'loading');
    }

    return this.getButton(
      <SpaceAvatar space={activeSpace} size={'s'} className={'spaceNavGraphic'} />,
      (activeSpace as Space).name
    );
  };

  private getButton = (linkIcon: JSX.Element, linkTitle: string) => {
    return (
      <EuiHeaderSectionItemButton
        aria-controls="headerSpacesMenuList"
        aria-expanded={this.state.showSpaceSelector}
        aria-haspopup="true"
        aria-label={linkTitle}
        title={linkTitle}
        onClick={this.toggleSpaceSelector}
      >
        {linkIcon}
      </EuiHeaderSectionItemButton>
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
