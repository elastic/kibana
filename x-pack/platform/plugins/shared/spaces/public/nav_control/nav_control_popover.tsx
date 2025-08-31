/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition, WithEuiThemeProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiSkeletonRectangle,
  EuiText,
  EuiTextTruncate,
  withEuiTheme,
} from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';
import type { Observable, Subscription } from 'rxjs';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { SpacesDescription } from './components/spaces_description';
import { SpacesMenu } from './components/spaces_menu';
import { SolutionViewTour } from './solution_view_tour';
import type { Space } from '../../common';
import type { EventTracker } from '../analytics';
import { getSpaceAvatarComponent } from '../space_avatar';
import type { SpacesManager } from '../spaces_manager';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

export interface Props {
  spacesManager: SpacesManager;
  anchorPosition: PopoverAnchorPosition;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  theme: WithEuiThemeProps['theme'];
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
  showTour$: Observable<boolean>;
  onFinishTour: () => void;
}

interface State {
  showSpaceSelector: boolean;
  loading: boolean;
  activeSpace: Space | null;
  spaces: Space[];
  showTour: boolean;
}

const popoutContentId = 'headerSpacesMenuContent';

class NavControlPopoverUI extends Component<Props, State> {
  private activeSpace$?: Subscription;
  private showTour$Sub?: Subscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      showSpaceSelector: false,
      loading: false,
      activeSpace: null,
      spaces: [],
      showTour: false,
    };
  }

  public componentDidMount() {
    this.activeSpace$ = this.props.spacesManager.onActiveSpaceChange$.subscribe({
      next: (activeSpace) => {
        this.setState({
          activeSpace,
        });
      },
    });

    this.showTour$Sub = this.props.showTour$.subscribe((showTour) => {
      this.setState({ showTour });
    });
  }

  public componentWillUnmount() {
    this.activeSpace$?.unsubscribe();
    this.showTour$Sub?.unsubscribe();
  }

  public render() {
    const button = this.getActiveSpaceButton();
    const { theme } = this.props;
    const { activeSpace } = this.state;

    const isTourOpen = Boolean(activeSpace) && this.state.showTour && !this.state.showSpaceSelector;

    let element: React.ReactNode;
    if (this.state.loading) {
      element = (
        <SpacesDescription
          id={popoutContentId}
          isLoading={this.state.loading}
          capabilities={this.props.capabilities}
          navigateToApp={this.props.navigateToApp}
          onClickManageSpaceBtn={() => {
            // No need to show the tour anymore, the user is taking action
            this.props.onFinishTour();
            this.toggleSpaceSelector();
          }}
        />
      );
    } else {
      element = (
        <SpacesMenu
          id={popoutContentId}
          spaces={this.state.spaces}
          serverBasePath={this.props.serverBasePath}
          toggleSpaceSelector={this.toggleSpaceSelector}
          capabilities={this.props.capabilities}
          navigateToApp={this.props.navigateToApp}
          navigateToUrl={this.props.navigateToUrl}
          activeSpace={this.state.activeSpace}
          allowSolutionVisibility={this.props.allowSolutionVisibility}
          eventTracker={this.props.eventTracker}
          onClickManageSpaceBtn={() => {
            // No need to show the tour anymore, the user is taking action
            this.props.onFinishTour();
            this.toggleSpaceSelector();
          }}
        />
      );
    }

    return (
      <SolutionViewTour
        solution={activeSpace?.solution}
        isTourOpen={isTourOpen}
        onFinishTour={this.props.onFinishTour}
      >
        <EuiPopover
          id="spcMenuPopover"
          button={button}
          isOpen={this.state.showSpaceSelector}
          closePopover={this.closeSpaceSelector}
          anchorPosition={this.props.anchorPosition}
          panelPaddingSize="none"
          repositionOnScroll
          ownFocus
          zIndex={Number(theme.euiTheme.levels.navigation) + 1} // it needs to sit above the collapsible nav menu
          panelProps={{
            'data-test-subj': 'spaceMenuPopoverPanel',
          }}
        >
          {element}
        </EuiPopover>
      </SolutionViewTour>
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

  private getAlignedLoadingSpinner() {
    return (
      <EuiSkeletonRectangle
        borderRadius="m"
        contentAriaLabel={i18n.translate('xpack.spaces.navControl.popover.loadingSpacesLabel', {
          defaultMessage: 'Loading spaces navigation',
        })}
      />
    );
  }

  private getActiveSpaceButton = () => {
    const { activeSpace } = this.state;

    if (!activeSpace) {
      return this.getButton(this.getAlignedLoadingSpinner(), 'loading spaces navigation');
    }

    // Map solution types to their properties
    const getSolutionData = (solution: string | undefined) => {
      const solutionMap = {
        oblt: { name: 'Observability', icon: 'logoObservability' },
        security: { name: 'Security', icon: 'logoSecurity' },
        es: { name: 'Elasticsearch', icon: 'logoElasticsearch' },
      };

      return (
        solutionMap[solution as keyof typeof solutionMap] || {
          name: 'Classic',
          icon: 'logoElasticStack',
        }
      );
    };

    const solutionData = getSolutionData(activeSpace.solution);
    const solutionText = solutionData.name;

    const buttonContent = (
      // <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      //   <EuiFlexItem grow={false}>
      //     <EuiIcon type={solutionData.icon} size="m" title={`Solution: ${solutionText}`} />
      //   </EuiFlexItem>
      //   <EuiFlexItem grow={false}>
      //     <EuiText size="s">
      //       <EuiTextTruncate width={120} text={(activeSpace as Space).name} truncation="end" />
      //     </EuiText>
      //   </EuiFlexItem>
      // </EuiFlexGroup>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <Suspense fallback={this.getAlignedLoadingSpinner()}>
            <LazySpaceAvatar space={activeSpace} size={'s'} />
          </Suspense>
        </EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            {/* CURRENTLY: Solution icon */}
            <EuiIcon type={solutionData.icon} size="m" title={`Solution: ${solutionText}`} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiTextTruncate width={120} text={solutionText} truncation="end" />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );

    return this.getButton(buttonContent, `${(activeSpace as Space).name} - ${solutionText}`);
  };

  private getButton = (linkIcon: JSX.Element, linkTitle: string) => {
    const { euiTheme } = this.props.theme;
    
    return (
      <EuiHeaderSectionItemButton
        aria-controls={popoutContentId}
        aria-expanded={this.state.showSpaceSelector}
        aria-haspopup="true"
        aria-label={i18n.translate('xpack.spaces.navControl.popover.spacesNavigationLabel', {
          defaultMessage: 'Spaces navigation',
        })}
        aria-describedby="spacesNavDetails"
        data-test-subj="spacesNavSelector"
        title={linkTitle}
        onClick={this.toggleSpaceSelector}
        textProps={false}
        style={{
          height: euiTheme.size.xl,
          paddingInlineStart: euiTheme.size.xs,
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          border: euiTheme.border.thin,
        }}
      >
        {linkIcon}
        <p id="spacesNavDetails" hidden>
          {i18n.translate('xpack.spaces.navControl.popover.spaceNavigationDetails', {
            defaultMessage:
              '{space} is the currently selected space. Click this button to open a popover that allows you to select the active space.',
            values: {
              space: linkTitle,
            },
          })}
        </p>
      </EuiHeaderSectionItemButton>
    );
  };

  protected toggleSpaceSelector = () => {
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
}

export const NavControlPopover = withEuiTheme(NavControlPopoverUI);
