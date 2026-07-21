/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIcon, EuiSideNav, type EuiSideNavItemType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { CLOUD_PROVIDERS, type CloudProviderId } from './cloud_providers';

interface CloudSideNavProps {
  /** Active provider (`aws` / `gcp` / `azure`), when on a provider or service page. */
  readonly providerScope?: CloudProviderId;
  /** Active service id (e.g. `ec2`), when on a service page. */
  readonly serviceScope?: string;
}

/**
 * In-page navigation tree for the Cloud hierarchy, built on the raw
 * `EuiSideNav` component.
 *
 * The global (chrome) side navigation runs on Kibana's new "solution"
 * renderer, which caps out at two levels with static, non-collapsible
 * section labels — so it can't express `Cloud > provider > service`.
 * `EuiSideNav` has no such limit: it renders a real, arbitrarily-nested
 * tree and auto-expands the active branch as the user drills in
 * (services show only under the selected provider), which is exactly the
 * collapsible nested behavior we want here.
 *
 * The whole tree is derived from {@link CLOUD_PROVIDERS}, so adding a
 * provider or service needs no change in this file.
 */
export const CloudSideNav = ({ providerScope, serviceScope }: CloudSideNavProps) => {
  const router = useStreamsAppRouter();

  // Build an `href` + SPA-aware `onClick` pair for a router target. The
  // href keeps hover, middle-click and "open in new tab" honest; the
  // onClick intercepts plain left clicks and routes through the in-app
  // history instead of triggering a full page reload.
  const makeNav = useCallback(
    (href: string, navigate: () => void) => ({
      href,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate();
      },
    }),
    []
  );

  const items: Array<EuiSideNavItemType<object>> = [
    {
      id: 'cloud',
      name: i18n.translate('xpack.streams.entityCentricLab.cloudSideNav.root', {
        defaultMessage: 'Cloud',
      }),
      icon: <EuiIcon type="cloud" />,
      isSelected: !providerScope,
      ...makeNav(router.link('/entities/{category}', { path: { category: 'cloud' } }), () =>
        router.push('/entities/{category}', { path: { category: 'cloud' }, query: {} })
      ),
      items: CLOUD_PROVIDERS.map((provider) => {
        const isProviderActive = providerScope === provider.id;
        return {
          id: provider.id,
          name: provider.label,
          icon: <EuiIcon type={provider.icon} />,
          isSelected: isProviderActive && !serviceScope,
          // Keep the active provider expanded so its services stay visible
          // even on the provider overview page (where no service is
          // selected). Inactive providers collapse, giving the tree its
          // self-collapsing feel as the user moves between providers.
          forceOpen: isProviderActive,
          ...makeNav(
            router.link('/entities/cloud/{provider}', {
              path: { provider: provider.id },
            }),
            () =>
              router.push('/entities/cloud/{provider}', {
                path: { provider: provider.id },
                query: {},
              })
          ),
          items: provider.services.map((service) => ({
            id: `${provider.id}-${service.id}`,
            name: service.label,
            isSelected: isProviderActive && serviceScope === service.id,
            ...makeNav(
              router.link('/entities/cloud/{provider}/{service}', {
                path: { provider: provider.id, service: service.id },
              }),
              () =>
                router.push('/entities/cloud/{provider}/{service}', {
                  path: { provider: provider.id, service: service.id },
                  query: {},
                })
            ),
          })),
        };
      }),
    },
  ];

  return (
    <EuiSideNav
      aria-label={i18n.translate('xpack.streams.entityCentricLab.cloudSideNav.ariaLabel', {
        defaultMessage: 'Cloud providers and services',
      })}
      mobileTitle={i18n.translate('xpack.streams.entityCentricLab.cloudSideNav.mobileTitle', {
        defaultMessage: 'Cloud',
      })}
      items={items}
      data-test-subj="entityCentricLabCloudSideNav"
    />
  );
};
