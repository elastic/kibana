/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../../../../../spaces/common/constants';
import { Space } from '../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../spaces/public/components';

interface Props {
  spaces: Space[];
  intl: InjectedIntl;
  buttonText: string;
}

interface State {
  searchTerm: string;
  allowSpacesListFocus: boolean;
  isPopoverOpen: boolean;
}

export class SpacesPopoverList extends Component<Props, State> {
  public state = {
    searchTerm: '',
    allowSpacesListFocus: false,
    isPopoverOpen: false,
  };

  public render() {
    const button = (
      <EuiButtonEmpty size={'xs'} onClick={this.onButtonClick}>
        <span className="secSpacesPopoverList__buttonText">{this.props.buttonText}</span>
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id={'spacesPopoverList'}
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        ownFocus
      >
        {this.getMenuPanel()}
      </EuiPopover>
    );
  }

  private getMenuPanel = () => {
    const { intl } = this.props;
    const { searchTerm } = this.state;

    const items = this.getVisibleSpaces(searchTerm).map(this.renderSpaceMenuItem);

    const panelProps = {
      className: 'spcMenu',
      title: intl.formatMessage({
        id: 'xpack.security.management.editRole.spacesPopoverList.popoverTitle',
        defaultMessage: 'Spaces',
      }),
      watchedItemProps: ['data-search-term'],
    };

    if (this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD) {
      return (
        <EuiContextMenuPanel {...panelProps}>
          {this.renderSearchField()}
          {this.renderSpacesListPanel(items, searchTerm)}
        </EuiContextMenuPanel>
      );
    }

    return <EuiContextMenuPanel {...panelProps} items={items} />;
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
      searchTerm: '',
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
      searchTerm: '',
    });
  };

  private getVisibleSpaces = (searchTerm: string): Space[] => {
    const { spaces } = this.props;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces.filter(space => {
        const { name, description = '' } = space;
        return (
          name.toLowerCase().indexOf(searchTerm) >= 0 ||
          description.toLowerCase().indexOf(searchTerm) >= 0
        );
      });
    }

    return filteredSpaces;
  };

  private renderSpacesListPanel = (items: JSX.Element[], searchTerm: string) => {
    if (items.length === 0) {
      return (
        <EuiText color="subdued" className="eui-textCenter">
          <FormattedMessage
            id="xpack.security.management.editRole.spacesPopoverList.noSpacesFoundTitle"
            defaultMessage=" no spaces found "
          />
        </EuiText>
      );
    }

    return (
      <EuiContextMenuPanel
        key={`spcMenuList`}
        data-search-term={searchTerm}
        className="spcMenu__spacesList"
        hasFocus={this.state.allowSpacesListFocus}
        initialFocusedItemIndex={this.state.allowSpacesListFocus ? 0 : undefined}
        items={items}
      />
    );
  };

  private renderSearchField = () => {
    const { intl } = this.props;
    return (
      <div key="manageSpacesSearchField" className="spcMenu__searchFieldWrapper">
        {
          // @ts-ignore onSearch isn't defined on the type
          <EuiFieldSearch
            placeholder={intl.formatMessage({
              id: 'xpack.security.management.editRole.spacesPopoverList.findSpacePlaceholder',
              defaultMessage: 'Find a space',
            })}
            incremental={true}
            onSearch={this.onSearch}
            onKeyDown={this.onSearchKeyDown}
            onFocus={this.onSearchFocus}
            compressed
          />
        }
      </div>
    );
  };

  private onSearchKeyDown = (e: any) => {
    //  9: tab
    // 13: enter
    // 40: arrow-down
    const focusableKeyCodes = [9, 13, 40];

    const keyCode = e.keyCode;
    if (focusableKeyCodes.includes(keyCode)) {
      // Allows the spaces list panel to recieve focus. This enables keyboard and screen reader navigation
      this.setState({
        allowSpacesListFocus: true,
      });
    }
  };

  private onSearchFocus = () => {
    this.setState({
      allowSpacesListFocus: false,
    });
  };

  private onSearch = (searchTerm: string) => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase(),
    });
  };

  private renderSpaceMenuItem = (space: Space): JSX.Element => {
    const icon = <SpaceAvatar space={space} size={'s'} />;
    return (
      <EuiContextMenuItem
        key={space.id}
        icon={icon}
        toolTipTitle={space.description && space.name}
        toolTipContent={space.description}
      >
        {space.name}
      </EuiContextMenuItem>
    );
  };
}
