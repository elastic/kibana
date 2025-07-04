/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_popover_list.scss';

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFocusTrap,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import React, { Component, memo, Suspense } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '@kbn/spaces-plugin/common';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';

interface Props {
  spaces: Space[];
  buttonText: string;
  spacesApiUi: SpacesApiUi;
}

interface State {
  allowSpacesListFocus: boolean;
  isPopoverOpen: boolean;
}

export class SpacesPopoverList extends Component<Props, State> {
  public state = {
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
        ownFocus={false}
      >
        <EuiFocusTrap>{this.getMenuPanel()}</EuiFocusTrap>
      </EuiPopover>
    );
  }

  private getMenuPanel = () => {
    const options = this.getSpaceOptions();

    const noSpacesMessage = (
      <EuiText color="subdued" className="eui-textCenter">
        <FormattedMessage
          id="xpack.security.management.editRole.spacesPopoverList.noSpacesFoundTitle"
          defaultMessage=" no spaces found "
        />
      </EuiText>
    );

    return (
      <EuiSelectable
        className={'spcMenu'}
        title={i18n.translate('xpack.security.management.editRole.spacesPopoverList.popoverTitle', {
          defaultMessage: 'Spaces',
        })}
        searchable={this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD}
        searchProps={
          this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD
            ? ({
                placeholder: i18n.translate(
                  'xpack.security.management.editRole.spacesPopoverList.findSpacePlaceholder',
                  {
                    defaultMessage: 'Find a space',
                  }
                ),
                compressed: true,
                isClearable: true,
                id: 'spacesPopoverListSearch',
              } as any)
            : undefined
        }
        noMatchesMessage={noSpacesMessage}
        options={options}
        singleSelection={true}
        style={{ width: 300 }}
        listProps={{
          rowHeight: 40,
          showIcons: false,
          onFocusBadge: false,
        }}
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate(
                'xpack.security.management.editRole.spacesPopoverList.selectSpacesTitle',
                {
                  defaultMessage: 'Spaces',
                }
              )}
            </EuiPopoverTitle>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    );
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

  private getSpaceOptions = (): EuiSelectableOption[] => {
    const LazySpaceAvatar = memo(this.props.spacesApiUi.components.getSpaceAvatar);

    return this.props.spaces.map((space) => {
      const icon = (
        <Suspense fallback={<EuiLoadingSpinner size="m" />}>
          <LazySpaceAvatar space={space} size={'s'} announceSpaceName={false} />
        </Suspense>
      );
      return {
        'aria-label': space.name,
        'aria-roledescription': 'space',
        label: space.name,
        key: space.id,
        prepend: icon,
        checked: undefined,
        'data-test-subj': `${space.id}-selectableSpaceItem`,
        className: 'selectableSpaceItem',
      };
    });
  };
}
