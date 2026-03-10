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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { Observable } from 'rxjs';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { useKbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider, useQuery } from '@kbn/react-query';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { SpaceCards, SpaceTable } from './components';
import * as styles from './space_selector.styles';
import type { Space } from '../../common';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../common/constants';
import type { SpacesManager } from '../spaces_manager';

// Number of spaces above which the selector defaults to table view for better scalability
export const VIEW_MODE_THRESHOLD = 20;

type ViewMode = 'grid' | 'table';
export interface SpaceSelectorProps {
  spacesManager: SpacesManager;
  serverBasePath: string;
  customBranding$: Observable<CustomBranding>;
}

const ViewToggle = ({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
}) => {
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
      data-test-subj="kibanaSpaceSelectorViewToggle"
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
      onChange={(id) => onChange(id as ViewMode)}
      buttonSize="m"
      isIconOnly
    />
  );
};

export const SpaceSelector = ({
  spacesManager,
  serverBasePath,
  customBranding$,
}: SpaceSelectorProps) => {
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('grid');
  const [customLogo, setCustomLogo] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const { euiTheme } = useEuiTheme();

  const {
    data: spaces,
    isLoading,
    error,
  } = useQuery<Space[], Error>({
    queryKey: ['spaces_list'],
    queryFn: () => spacesManager.getSpaces(),
    enabled: !searchTerm,
  });

  useEffect(() => {
    setCurrentViewMode((spaces?.length ?? 0) > VIEW_MODE_THRESHOLD ? 'table' : 'grid');
  }, [spaces]);

  const filteredSpaces = useMemo(() => {
    if (!spaces) {
      return [];
    }
    return spaces.filter((space) => {
      return (
        space.name.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
        space.description?.toLowerCase().includes(searchTerm?.toLowerCase() || '')
      );
    });
  }, [spaces, searchTerm]);

  useEffect(() => {
    const subscription = customBranding$.subscribe((next) => {
      setCustomLogo(next.logo);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [customBranding$]);

  const onViewModeChange = useCallback((viewMode: ViewMode) => {
    setCurrentViewMode(viewMode);
  }, []);

  const onSearch = useCallback((term: string) => {
    setSearchTerm(term.trim().toLowerCase());
  }, []);

  const renderListFilterControls = useCallback(() => {
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
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: ${euiTheme.components.forms.maxWidth};
                max-width: 100%;
              `}
              data-test-subj="kibanaSpaceSelectorSearchField"
            >
              <EuiFieldSearch
                placeholder={inputLabel}
                aria-label={inputLabel}
                incremental={true}
                onSearch={onSearch}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ViewToggle viewMode={currentViewMode} onChange={onViewModeChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
      </>
    );
  }, [currentViewMode, euiTheme.components.forms.maxWidth, onSearch, onViewModeChange, spaces]);

  const focusHeaderOnMount = useCallback(
    (node: HTMLHeadingElement | null) => {
      headerRef.current = node;
      // forcing focus of header for screen readers to announce on page load
      headerRef.current?.focus();
    },
    [headerRef]
  );

  return (
    <KibanaPageTemplate css={styles.pageTemplateStyles} data-test-subj="kibanaSpaceSelector">
      <BackgroundPortal />
      <KibanaPageTemplate.Section color="transparent" paddingSize="xl">
        <EuiText textAlign="center" size="s">
          <EuiSpacer size="xxl" />
          {customLogo ? (
            <EuiImage
              src={customLogo}
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
            <h1 css={styles.headerStyles} tabIndex={-1} ref={focusHeaderOnMount}>
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
        <Fragment>
          {renderListFilterControls()}
          <Fragment>
            {isLoading ? (
              <div css={styles.spacesLoadingSpinnerStyles} data-test-subj="spacesLoadingSpinner">
                <EuiLoadingSpinner size="xl" />
              </div>
            ) : (
              <Fragment>
                {!error ? (
                  <Fragment>
                    {filteredSpaces.length > 0 ? (
                      <Fragment>
                        {currentViewMode === 'grid' ? (
                          <SpaceCards spaces={filteredSpaces} serverBasePath={serverBasePath} />
                        ) : (
                          <SpaceTable spaces={filteredSpaces} serverBasePath={serverBasePath} />
                        )}
                      </Fragment>
                    ) : (
                      <Fragment>
                        <EuiSpacer />
                        <EuiPanel css={styles.panelStyles} color="subdued">
                          <EuiTitle size="xs">
                            <h2>
                              {i18n.translate(
                                'xpack.spaces.spaceSelector.noSpacesMatchSearchCriteriaDescription',
                                {
                                  defaultMessage: 'No spaces match "{searchTerm}"',
                                  values: { searchTerm },
                                }
                              )}
                            </h2>
                          </EuiTitle>
                        </EuiPanel>
                      </Fragment>
                    )}
                  </Fragment>
                ) : (
                  <Fragment>
                    <EuiSpacer />
                    <EuiPanel css={styles.panelStyles} color="danger">
                      <EuiText size="s" color="danger">
                        <h2>
                          <FormattedMessage
                            id="xpack.spaces.spaceSelector.errorLoadingSpacesDescription"
                            defaultMessage="Error loading spaces ({message})"
                            values={{ message: error.message }}
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
              </Fragment>
            )}
          </Fragment>
        </Fragment>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

export const renderSpaceSelectorApp = (
  services: Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile' | 'rendering'>,
  { element }: Pick<AppMountParameters, 'element'>,
  props: SpaceSelectorProps
) => {
  const queryClient = new QueryClient();

  ReactDOM.render(
    services.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <SpaceSelector {...props} />
      </QueryClientProvider>
    ),
    element
  );
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
