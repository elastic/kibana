/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './space_selector.scss';

import {
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';
import type { Observable, Subscription } from 'rxjs';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { useKbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { euiThemeVars } from '@kbn/ui-theme';

import { SpaceCards, SpaceTable } from './components';
import type { Space } from '../../common';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../common/constants';
import type { SpacesManager } from '../spaces_manager';

// Number of spaces above which the selector defaults to table view for better scalability
const VIEW_MODE_THRESHOLD = 20;

type ViewMode = 'grid' | 'table';

interface Props {
  spacesManager: SpacesManager;
  serverBasePath: string;
  customBranding$: Observable<CustomBranding>;
}

interface State {
  loading: boolean;
  searchTerm: string;
  spaces: Space[];
  error?: Error;
  customLogo?: string;
  viewMode: ViewMode;
}

export class SpaceSelector extends Component<Props, State> {
  private headerRef?: HTMLElement | null;
  private customBrandingSubscription?: Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      loading: false,
      searchTerm: '',
      spaces: [],
      viewMode: 'grid',
    };
  }

  public setHeaderRef = (ref: HTMLElement | null) => {
    this.headerRef = ref;
    // forcing focus of header for screen readers to announce on page load
    if (this.headerRef) {
      this.headerRef.focus();
    }
  };

  public componentDidMount() {
    if (this.state.spaces.length === 0) {
      this.loadSpaces();
    }
    this.customBrandingSubscription = this.props.customBranding$.subscribe((next) => {
      this.setState({ ...this.state, customLogo: next.logo });
    });
  }

  public componentWillUnmount() {
    this.customBrandingSubscription?.unsubscribe();
  }

  public loadSpaces() {
    this.setState({ loading: true });
    const { spacesManager } = this.props;

    spacesManager
      .getSpaces()
      .then((spaces) => {
        this.setState({
          loading: false,
          spaces,
          viewMode: spaces.length > VIEW_MODE_THRESHOLD ? 'table' : 'grid',
        });
      })
      .catch((err) => {
        this.setState({
          loading: false,
          error: err,
        });
      });
  }

  public render() {
    const { spaces, searchTerm } = this.state;

    const panelStyles = css`
      text-align: center;
      margin-inline: auto;
      max-width: 700px;
    `;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces.filter(
        (space) =>
          space.name.toLowerCase().indexOf(searchTerm) >= 0 ||
          (space.description || '').toLowerCase().indexOf(searchTerm) >= 0
      );
    }

    return (
      <KibanaPageTemplate
        css={css`
          background-color: transparent;
        `}
        data-test-subj="kibanaSpaceSelector"
      >
        <BackgroundPortal />
        <KibanaPageTemplate.Section color="transparent" paddingSize="xl">
          <EuiText textAlign="center" size="s">
            <EuiSpacer size="xxl" />
            {this.state.customLogo ? (
              <EuiImage
                src={this.state.customLogo}
                size={64}
                alt={i18n.translate('xpack.spaces.spaceSelector.customLogoAlt', {
                  defaultMessage: 'Custom logo',
                })}
              />
            ) : (
              <KibanaSolutionAvatar name="Elastic" size="xl" />
            )}
            <EuiSpacer size="xxl" />
            <EuiTextColor color="subdued">
              <h1
                css={css`
                  &:focus {
                    outline: none;
                    text-decoration: underline;
                  }
                `}
                tabIndex={-1}
                ref={this.setHeaderRef}
              >
                <FormattedMessage
                  id="xpack.spaces.spaceSelector.selectSpacesTitle"
                  defaultMessage="Select your space"
                />
              </h1>
              <p>
                <FormattedMessage
                  id="xpack.spaces.spaceSelector.changeSpaceAnytimeAvailabilityText"
                  defaultMessage="You can change your space at anytime."
                />
              </p>
            </EuiTextColor>
          </EuiText>
          <EuiSpacer size="xl" />

          {this.getSearchAndToggle()}

          {this.state.loading && <EuiLoadingSpinner size="xl" />}

          {!this.state.loading &&
            (this.state.viewMode === 'grid' ? (
              <SpaceCards spaces={filteredSpaces} serverBasePath={this.props.serverBasePath} />
            ) : (
              <SpaceTable spaces={filteredSpaces} serverBasePath={this.props.serverBasePath} />
            ))}

          {!this.state.loading && !this.state.error && filteredSpaces.length === 0 && (
            <Fragment>
              <EuiSpacer />
              <EuiPanel css={panelStyles} color="subdued">
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.spaces.spaceSelector.noSpacesMatchSearchCriteriaDescription',
                      {
                        defaultMessage: 'No spaces match {searchTerm}',
                        values: { searchTerm: `"${this.state.searchTerm}"` },
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiPanel>
            </Fragment>
          )}

          {!this.state.loading && this.state.error && (
            <Fragment>
              <EuiSpacer />
              <EuiPanel css={panelStyles} color="danger">
                <EuiText size="s" color="danger">
                  <h2>
                    <FormattedMessage
                      id="xpack.spaces.spaceSelector.errorLoadingSpacesDescription"
                      defaultMessage="Error loading spaces ({message})"
                      values={{ message: this.state.error.message }}
                    />
                  </h2>
                  <p>
                    <FormattedMessage
                      id="xpack.spaces.spaceSelector.contactSysAdminDescription"
                      defaultMessage="Contact your system administrator."
                    />
                  </p>
                </EuiText>
              </EuiPanel>
            </Fragment>
          )}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  public getSearchField = () => {
    if (!this.state.spaces || this.state.spaces.length < SPACE_SEARCH_COUNT_THRESHOLD) {
      return null;
    }

    const inputLabel = i18n.translate('xpack.spaces.spaceSelector.findSpacePlaceholder', {
      defaultMessage: 'Find a space',
    });

    return (
      <>
        <div
          css={css`
            width: ${euiThemeVars.euiFormMaxWidth};
            max-width: 100%;
            margin-inline: auto;
          `}
        >
          <EuiFieldSearch
            placeholder={inputLabel}
            aria-label={inputLabel}
            incremental={true}
            onSearch={this.onSearch}
          />
        </div>
        <EuiSpacer size="xl" />
      </>
    );
  };

  public onSearch = (searchTerm = '') => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase(),
    });
  };

  public onViewModeChange = (viewMode: ViewMode) => {
    this.setState({ viewMode });
  };

  public getViewToggle = () => {
    const { viewMode } = this.state;

    const toggleOptions = [
      {
        id: 'grid',
        label: i18n.translate('xpack.spaces.spaceSelector.gridViewLabel', {
          defaultMessage: 'Grid view',
        }),
        iconType: 'apps',
      },
      {
        id: 'table',
        label: i18n.translate('xpack.spaces.spaceSelector.tableViewLabel', {
          defaultMessage: 'Table view',
        }),
        iconType: 'list',
      },
    ];

    return (
      <EuiButtonGroup
        css={css`
          .euiButtonGroup__buttons .euiButtonGroupButton {
            min-width: 40px;
            width: 40px;
          }
        `}
        legend={i18n.translate('xpack.spaces.spaceSelector.viewToggleLegend', {
          defaultMessage: 'View options',
        })}
        options={toggleOptions}
        idSelected={viewMode}
        onChange={(id) => this.onViewModeChange(id as ViewMode)}
        buttonSize="m"
        isIconOnly
      />
    );
  };

  public getSearchAndToggle = () => {
    const { spaces } = this.state;

    // Show search field and toggle if we have enough spaces to warrant them
    const showSearchAndToggle = spaces && spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD;

    if (!showSearchAndToggle) {
      return null;
    }

    const inputLabel = i18n.translate('xpack.spaces.spaceSelector.findSpacePlaceholder', {
      defaultMessage: 'Find a space',
    });

    return (
      <>
        <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="center">
          {showSearchAndToggle && (
            <EuiFlexItem grow={false}>
              <div
                css={css`
                  width: ${euiThemeVars.euiFormMaxWidth};
                  max-width: 100%;
                `}
              >
                <EuiFieldSearch
                  placeholder={inputLabel}
                  aria-label={inputLabel}
                  incremental={true}
                  onSearch={this.onSearch}
                />
              </div>
            </EuiFlexItem>
          )}
          {showSearchAndToggle && <EuiFlexItem grow={false}>{this.getViewToggle()}</EuiFlexItem>}
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
      </>
    );
  };
}

export const renderSpaceSelectorApp = (
  services: Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile' | 'rendering'>,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) => {
  ReactDOM.render(services.rendering.addContext(<SpaceSelector {...props} />), element);
  return () => ReactDOM.unmountComponentAtNode(element);
};

// portal the fixed background graphic so it doesn't affect page positioning or overlap on top of global banners
const BackgroundPortal = React.memo(function BackgroundPortal() {
  const kbnFullScreenBgCss = useKbnFullScreenBgCss();
  return (
    <EuiPortal>
      <div
        className="spcSelectorBackground spcSelectorBackground__nonMixinAttributes"
        css={kbnFullScreenBgCss}
        role="presentation"
      />
    </EuiPortal>
  );
});
