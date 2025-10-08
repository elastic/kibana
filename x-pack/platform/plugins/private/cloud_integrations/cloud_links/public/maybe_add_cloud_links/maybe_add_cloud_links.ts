/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, defer, filter, map, of, combineLatest, from, switchMap } from 'rxjs';

import { i18n } from '@kbn/i18n';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { createUserMenuLinks } from './user_menu_links';
import { createHelpMenuLinks } from './help_menu_links';

export interface MaybeAddCloudLinksDeps {
  core: CoreStart;
  security: SecurityPluginStart;
  cloud: CloudStart;
  share: SharePluginStart;
  isServerless: boolean;
}

export function maybeAddCloudLinks({
  core,
  security,
  cloud,
  isServerless,
}: MaybeAddCloudLinksDeps): void {
  const userObservable = defer(() => security.authc.getCurrentUser()).pipe(
    // Check if user is a cloud user.
    map((user) => user.elastic_cloud_user),
    // If user is not defined due to an unexpected error, then fail *open*.
    catchError(() => of(true)),
    filter((isElasticCloudUser) => isElasticCloudUser === true),
    switchMap(() => {
      if (cloud.deploymentUrl) {
        core.chrome.setCustomNavLink({
          title: i18n.translate('xpack.cloudLinks.deploymentLinkLabel', {
            defaultMessage: 'Manage this deployment',
          }),
          euiIconType: 'logoCloud',
          href: cloud.deploymentUrl,
        });
      }

      // Convert the promise to an observable and handle it properly
      return from(
        createUserMenuLinks({
          core,
          cloud,
          security,
          isServerless,
        })
      ).pipe(
        map((userMenuLinks) => {
          security.navControlService.addUserMenuLinks(userMenuLinks);
        })
      );
    })
  );

  const helpObservable = core.chrome.getHelpSupportUrl$();

  if (cloud.isCloudEnabled) {
    combineLatest({ user: userObservable, helpSupportUrl: helpObservable }).subscribe(
      ({ helpSupportUrl }) => {
        const helpMenuLinks = createHelpMenuLinks({
          docLinks: core.docLinks,
          helpSupportUrl,
          isServerless,
        });

        core.chrome.setHelpMenuLinks(helpMenuLinks);
      }
    );
  }
}
