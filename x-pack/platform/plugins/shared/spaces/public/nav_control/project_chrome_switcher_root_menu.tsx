/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ElementRef } from 'react';
import React, { Fragment, lazy, Suspense, useCallback, useMemo, useRef } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../common';
import { getSpaceAvatarComponent } from '../space_avatar';
import { getSpaceSolutionIconType } from '../space_solution_badge';

const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

export interface ProjectChromeSwitcherRootMenuProps {
  activeSpace: Space;
  /** Matches the deployment / project line in the header switcher trigger. */
  deploymentDisplayName: string;
  allowSolutionVisibility: boolean;
  /**
   * Spaces list UI; receives `navigateToPreviousContextPanel` to return to the root switcher
   * (the spaces panel omits the default context-menu title row so back lives in this content).
   */
  spacesMenu: (args: {
    navigateToPreviousContextPanel: () => void;
  }) => React.ReactNode;
}

function getSolutionSubtitleMessage(solution?: Space['solution']) {
  switch (solution) {
    case 'security':
      return (
        <FormattedMessage
          id="xpack.spaces.navControl.projectChromeSwitcherRoot.securitySpaceSubtitle"
          defaultMessage="Security space"
        />
      );
    case 'oblt':
      return (
        <FormattedMessage
          id="xpack.spaces.navControl.projectChromeSwitcherRoot.observabilitySpaceSubtitle"
          defaultMessage="Observability space"
        />
      );
    case 'es':
      return (
        <FormattedMessage
          id="xpack.spaces.navControl.projectChromeSwitcherRoot.elasticsearchSpaceSubtitle"
          defaultMessage="Elasticsearch space"
        />
      );
    case 'workplaceai':
      return (
        <FormattedMessage
          id="xpack.spaces.navControl.projectChromeSwitcherRoot.workplaceAiSpaceSubtitle"
          defaultMessage="Workplace AI space"
        />
      );
    case 'classic':
    default:
      return (
        <FormattedMessage
          id="xpack.spaces.navControl.projectChromeSwitcherRoot.classicSpaceSubtitle"
          defaultMessage="Classic space"
        />
      );
  }
}

export function ProjectChromeSwitcherRootMenu({
  activeSpace,
  deploymentDisplayName,
  allowSolutionVisibility,
  spacesMenu,
}: ProjectChromeSwitcherRootMenuProps) {
  const { euiTheme } = useEuiTheme();
  const contextMenuRef = useRef<ElementRef<typeof EuiContextMenu>>(null);

  const navigateToPreviousContextPanel = useCallback(() => {
    window.requestAnimationFrame(() => {
      contextMenuRef.current?.showPreviousPanel();
    });
  }, []);

  const inertFooterMenuItemClick = useCallback(() => {}, []);

  const deploymentsPanelTitle = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.deploymentsPanelTitle', {
        defaultMessage: 'My deployments',
      }),
    []
  );

  const manageDeploymentLabel = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.manageDeploymentLabel', {
        defaultMessage: 'Manage deployment',
      }),
    []
  );

  const viewAllDeploymentsLabel = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.viewAllDeploymentsLabel', {
        defaultMessage: 'View all deployments',
      }),
    []
  );

  const createDeploymentLabel = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.createDeploymentLabel', {
        defaultMessage: 'Create deployment',
      }),
    []
  );

  const getStartedLabel = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.getStartedLabel', {
        defaultMessage: 'Get started',
      }),
    []
  );

  const connectionDetailsLabel = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.connectionDetailsLabel', {
        defaultMessage: 'Connection details',
      }),
    []
  );

  const inviteUsersLabel = useMemo(
    () =>
      i18n.translate('xpack.spaces.navControl.projectChromeSwitcherRoot.inviteUsersLabel', {
        defaultMessage: 'Invite users',
      }),
    []
  );

  const contextMenuWrapperCss = useMemo(
    () => css`
      /* Inset menu cells from popover edges (8px). */
      padding: ${euiTheme.size.xs};

      /* Do not pass css to EuiContextMenu — it would replace EUI root panel styles. */
      & .euiContextMenuItem:where(a, button):not(:disabled) {
        border-radius: ${euiTheme.border.radius.small};

        &:hover,
        &:focus {
          text-decoration: none;
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      }

      /* EUI defaults panel arrows to flex-end; center with multi-line rows. */
      & .euiContextMenuItem .euiContextMenu__arrow {
        align-self: center;
      }

      & .euiHorizontalRule[data-test-subj='projectChromeSwitcherFooterSeparator'],
      & .euiHorizontalRule[data-test-subj='projectChromeSwitcherDeploymentsCreateSeparator'] {
        margin-block: ${euiTheme.size.xs};
      }

      /* Single-line menu rows: fixed 32px height (EUI panel forces size="m" on every item). */
      & .euiContextMenuItem[data-test-subj='projectChromeSwitcherGetStarted'],
      & .euiContextMenuItem[data-test-subj='projectChromeSwitcherConnectionDetails'],
      & .euiContextMenuItem[data-test-subj='projectChromeSwitcherInviteUsers'],
      & .euiContextMenuItem[data-test-subj='projectChromeSwitcherManageDeployment'],
      & .euiContextMenuItem[data-test-subj='projectChromeSwitcherViewAllDeployments'],
      & .euiContextMenuItem[data-test-subj='projectChromeSwitcherCreateDeployment'],
      & .euiContextMenuItem[data-test-subj='spacesMenuCreateSpace'] {
        box-sizing: border-box;
        min-block-size: 32px;
        block-size: 32px;
        padding: 0 ${euiTheme.size.m};
      }
    `,
    [
      euiTheme.border.radius.small,
      euiTheme.colors.backgroundBaseInteractiveHover,
      euiTheme.size.m,
      euiTheme.size.xs,
    ]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 'root',
        width: 375,
        items: [
          {
            key: 'deployments',
            'data-test-subj': 'projectChromeSwitcherDeploymentsTrigger',
            name: (
              <EuiFlexGroup
                direction="column"
                gutterSize="xs"
                alignItems="flexStart"
                responsive={false}
              >
                <EuiText size="s" css={{ fontWeight: euiTheme.font.weight.regular }}>
                  {deploymentDisplayName}
                </EuiText>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.spaces.navControl.projectChromeSwitcherRoot.deploymentSubtitle"
                    defaultMessage="Deployment"
                  />
                </EuiText>
              </EuiFlexGroup>
            ),
            panel: 'deployments',
            layoutAlign: 'center',
          },
          {
            key: 'spaces',
            'data-test-subj': 'projectChromeSwitcherSpacesTrigger',
            icon: (
              <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                <LazySpaceAvatar space={activeSpace} size="l" announceSpaceName={false} />
              </Suspense>
            ),
            name: (
              <EuiFlexGroup
                direction="column"
                gutterSize="xs"
                alignItems="flexStart"
                responsive={false}
              >
                <EuiText size="s" css={{ fontWeight: euiTheme.font.weight.regular }}>
                  {activeSpace.name}
                </EuiText>
                {allowSolutionVisibility ? (
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                    <EuiIcon
                      type={getSpaceSolutionIconType(activeSpace.solution)}
                      size="m"
                      aria-hidden
                    />
                    <EuiText size="xs" color="subdued">
                      {getSolutionSubtitleMessage(activeSpace.solution)}
                    </EuiText>
                  </EuiFlexGroup>
                ) : null}
              </EuiFlexGroup>
            ),
            panel: 'spaces',
            layoutAlign: 'center',
          },
          {
            isSeparator: true,
            key: 'projectChromeSwitcherFooterSeparator',
            'data-test-subj': 'projectChromeSwitcherFooterSeparator',
          },
          {
            key: 'getStarted',
            'data-test-subj': 'projectChromeSwitcherGetStarted',
            icon: <EuiIcon type="rocket" size="m" aria-hidden />,
            name: (
              <EuiText size="s" component="span" css={{ fontWeight: euiTheme.font.weight.regular }}>
                {getStartedLabel}
              </EuiText>
            ),
            onClick: inertFooterMenuItemClick,
            layoutAlign: 'center',
          },
          {
            key: 'connectionDetails',
            'data-test-subj': 'projectChromeSwitcherConnectionDetails',
            icon: <EuiIcon type="plugs" size="m" aria-hidden />,
            name: (
              <EuiText size="s" component="span" css={{ fontWeight: euiTheme.font.weight.regular }}>
                {connectionDetailsLabel}
              </EuiText>
            ),
            onClick: inertFooterMenuItemClick,
            layoutAlign: 'center',
          },
          {
            key: 'inviteUsers',
            'data-test-subj': 'projectChromeSwitcherInviteUsers',
            icon: <EuiIcon type="user" size="m" aria-hidden />,
            name: (
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                `}
              >
                <EuiText size="s" component="span" css={{ fontWeight: euiTheme.font.weight.regular }}>
                  {inviteUsersLabel}
                </EuiText>
                <EuiIcon type="external" size="m" color="subdued" aria-hidden />
              </span>
            ),
            onClick: inertFooterMenuItemClick,
            layoutAlign: 'center',
          },
        ],
      },
      {
        id: 'deployments',
        width: 375,
        'data-test-subj': 'projectChromeSwitcherDeploymentsPanel',
        content: (
          <Fragment>
            <EuiPopoverTitle
              paddingSize="s"
              css={css`
                border-block-end: none;
              `}
            >
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="chevronSingleLeft"
                        color="text"
                        size="xs"
                        data-test-subj="projectChromeDeploymentsPanelBack"
                        onClick={navigateToPreviousContextPanel}
                        aria-label={i18n.translate(
                          'xpack.spaces.navControl.projectChromeSwitcherRoot.deploymentsPanelBackAriaLabel',
                          {
                            defaultMessage: 'Back to switcher',
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{deploymentsPanelTitle}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false} />
              </EuiFlexGroup>
            </EuiPopoverTitle>
            <EuiContextMenuItem
              size="m"
              layoutAlign="center"
              icon={<EuiIcon type="gear" size="m" aria-hidden />}
              data-test-subj="projectChromeSwitcherManageDeployment"
              onClick={inertFooterMenuItemClick}
            >
              <EuiText size="s" component="span" css={{ fontWeight: euiTheme.font.weight.regular }}>
                {manageDeploymentLabel}
              </EuiText>
            </EuiContextMenuItem>
            <EuiContextMenuItem
              size="m"
              layoutAlign="center"
              icon={<EuiIcon type="grid" size="m" aria-hidden />}
              data-test-subj="projectChromeSwitcherViewAllDeployments"
              onClick={inertFooterMenuItemClick}
            >
              <EuiText size="s" component="span" css={{ fontWeight: euiTheme.font.weight.regular }}>
                {viewAllDeploymentsLabel}
              </EuiText>
            </EuiContextMenuItem>
            <EuiHorizontalRule
              margin="none"
              data-test-subj="projectChromeSwitcherDeploymentsCreateSeparator"
              css={css`
                margin-block: ${euiTheme.size.xs};
              `}
            />
            <EuiContextMenuItem
              size="m"
              layoutAlign="center"
              icon={<EuiIcon type="plus" size="m" aria-hidden />}
              data-test-subj="projectChromeSwitcherCreateDeployment"
              onClick={inertFooterMenuItemClick}
            >
              <EuiText size="s" component="span" css={{ fontWeight: euiTheme.font.weight.regular }}>
                {createDeploymentLabel}
              </EuiText>
            </EuiContextMenuItem>
          </Fragment>
        ),
      },
      {
        id: 'spaces',
        width: 400,
        'data-test-subj': 'projectChromeSwitcherSpacesPanel',
        content: spacesMenu({ navigateToPreviousContextPanel }),
      },
    ],
    [
      activeSpace,
      allowSolutionVisibility,
      connectionDetailsLabel,
      createDeploymentLabel,
      deploymentDisplayName,
      deploymentsPanelTitle,
      euiTheme.font.weight.regular,
      euiTheme.size.m,
      euiTheme.size.xs,
      getStartedLabel,
      inertFooterMenuItemClick,
      inviteUsersLabel,
      manageDeploymentLabel,
      navigateToPreviousContextPanel,
      spacesMenu,
      viewAllDeploymentsLabel,
    ]
  );

  return (
    <div css={contextMenuWrapperCss}>
      <EuiContextMenu
        ref={contextMenuRef}
        data-test-subj="projectChromeSwitcherContextMenu"
        initialPanelId="root"
        panels={panels}
        size="m"
      />
    </div>
  );
}
