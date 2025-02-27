/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_menu.scss';

import type { ExclusiveUnion } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable';
import type {
  EuiSelectableOnChangeEvent,
  EuiSelectableSearchableSearchProps,
} from '@elastic/eui/src/components/selectable/selectable';
import React, { Component, Fragment, lazy, Suspense } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { InjectedIntl } from '@kbn/i18n-react';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';

import { ManageSpacesButton } from './manage_spaces_button';
import type { Space } from '../../../common';
import { addSpaceIdToPath, ENTER_SPACE_PATH, SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common';
import type { EventTracker } from '../../analytics';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';

const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  id: string;
  spaces: Space[];
  serverBasePath: string;
  toggleSpaceSelector: () => void;
  onClickManageSpaceBtn: () => void;
  intl: InjectedIntl;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  readonly activeSpace: Space | null;
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
}
class SpacesMenuUI extends Component<Props> {
  public render() {
    const spaceOptions: EuiSelectableOption[] = this.getSpaceOptions();

    const noSpacesMessage = (
      <EuiText color="subdued" className="eui-textCenter">
        <FormattedMessage
          id="xpack.spaces.navControl.spacesMenu.noSpacesFoundTitle"
          defaultMessage=" no spaces found "
        />
      </EuiText>
    );

    // In the future this could be replaced by EuiSelectableSearchableProps, but at this time is is not exported from EUI
    const searchableProps: ExclusiveUnion<
      { searchable: true; searchProps: EuiSelectableSearchableSearchProps<{}> },
      { searchable: false }
    > =
      this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD
        ? {
            searchable: true,
            searchProps: {
              placeholder: i18n.translate(
                'xpack.spaces.navControl.spacesMenu.findSpacePlaceholder',
                {
                  defaultMessage: 'Find a space',
                }
              ),
              compressed: true,
              isClearable: true,
              id: 'headerSpacesMenuListSearch',
            },
          }
        : {
            searchable: false,
          };

    return (
      <Fragment>
        <EuiSelectable
          aria-label={i18n.translate('xpack.spaces.navControl.spacesMenu.spacesAriaLabel', {
            defaultMessage: 'Spaces',
          })}
          id={this.props.id}
          className={'spcMenu'}
          title={i18n.translate('xpack.spaces.navControl.spacesMenu.changeCurrentSpaceTitle', {
            defaultMessage: 'Change current space',
          })}
          {...searchableProps}
          noMatchesMessage={noSpacesMessage}
          options={spaceOptions}
          singleSelection={'always'}
          style={{ minWidth: 300, maxWidth: 320 }}
          onChange={this.spaceSelectionChange}
          listProps={{
            rowHeight: 40,
            showIcons: true,
            onFocusBadge: false,
          }}
        >
          {(list, search) => (
            <Fragment>
              <EuiPopoverTitle paddingSize="s">
                {search ||
                  i18n.translate('xpack.spaces.navControl.spacesMenu.selectSpacesTitle', {
                    defaultMessage: 'Spaces',
                  })}
              </EuiPopoverTitle>
              {list}
            </Fragment>
          )}
        </EuiSelectable>
        <EuiPopoverFooter paddingSize="s">{this.renderManageButton()}</EuiPopoverFooter>
      </Fragment>
    );
  }

  private getSpaceOptions = (): EuiSelectableOption[] => {
    return this.props.spaces.map((space) => {
      return {
        'aria-label': space.name,
        'aria-roledescription': 'space',
        label: space.name,
        key: space.id, // id is unique and we need it to form a path later
        prepend: (
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <LazySpaceAvatar space={space} size={'s'} announceSpaceName={false} />
          </Suspense>
        ),
        ...(this.props.allowSolutionVisibility && {
          append: <SpaceSolutionBadge solution={space.solution} />,
        }),
        checked: this.props.activeSpace?.id === space.id ? 'on' : undefined,
        'data-test-subj': `${space.id}-selectableSpaceItem`,
        className: 'selectableSpaceItem',
      };
    });
  };

  private getSpaceDetails = (id: string): Space | undefined => {
    return this.props.spaces.find((space) => space.id === id);
  };

  private spaceSelectionChange = async (
    newOptions: EuiSelectableOption[],
    event: EuiSelectableOnChangeEvent
  ) => {
    const selectedSpaceItem = newOptions.filter((item) => item.checked === 'on')[0];

    const trackSpaceChange = (nextId?: string) => {
      if (!nextId) return;
      const nextSpace = this.getSpaceDetails(nextId);
      const currentSpace = this.props.activeSpace;
      if (!nextSpace || !currentSpace) return;

      this.props.eventTracker.changeSpace({
        nextSpaceId: nextSpace.id,
        nextSolution: nextSpace.solution,
        prevSpaceId: currentSpace.id,
        prevSolution: currentSpace.solution,
      });
    };

    if (!!selectedSpaceItem) {
      const spaceId = selectedSpaceItem.key; // the key is the unique space id

      const urlToSelectedSpace = addSpaceIdToPath(
        this.props.serverBasePath,
        spaceId,
        ENTER_SPACE_PATH
      );

      let middleClick = false;
      if (event.type === 'click') {
        middleClick = (event as React.MouseEvent).button === 1;
      }

      if (event.shiftKey) {
        // Open in new window, shift is given priority over other modifiers
        this.props.toggleSpaceSelector();
        trackSpaceChange(spaceId);
        window.open(urlToSelectedSpace);
      } else if (event.ctrlKey || event.metaKey || middleClick) {
        // Open in new tab - either a ctrl click or middle mouse button
        trackSpaceChange(spaceId);
        window.open(urlToSelectedSpace, '_blank');
      } else {
        // Force full page reload (usually not a good idea, but we need to in order to change spaces)
        // If the selected space is already the active space, gracefully close the popover
        if (this.props.activeSpace?.id === selectedSpaceItem.key) {
          this.props.toggleSpaceSelector();
        } else {
          trackSpaceChange(spaceId);
          const flushAnalyticsEvents = window.__kbnAnalytics?.flush ?? (() => Promise.resolve());
          await flushAnalyticsEvents();
          this.props.navigateToUrl(urlToSelectedSpace);
        }
      }
    }
  };

  private renderManageButton = () => {
    return (
      <ManageSpacesButton
        key="manageSpacesButton"
        className="spcMenu__manageButton"
        size="s"
        onClick={this.props.onClickManageSpaceBtn}
        capabilities={this.props.capabilities}
        navigateToApp={this.props.navigateToApp}
      />
    );
  };
}

export const SpacesMenu = injectI18n(SpacesMenuUI);
