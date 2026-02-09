/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, map, ReplaySubject, takeUntil } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  AuthenticationServiceSetup,
  SecurityNavControlServiceStart,
  UserMenuLink,
} from '@kbn/security-plugin-types-public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { UserProfilesKibanaProvider } from '@kbn/user-profile-components';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { FooterUserMenu } from './footer_user_menu';
import { SecurityNavControl } from './nav_control_component';
import { VersionProvider, version$ } from './version_context';
import { VersionSwitcher } from './version_switcher';
import type { SecurityLicense } from '../../common';
import type { SecurityApiClients } from '../components';
import { AuthenticationProvider, SecurityApiClientsProvider } from '../components';

interface SetupDeps {
  securityLicense: SecurityLicense;
  logoutUrl: string;
  securityApiClients: SecurityApiClients;
}

interface StartDeps {
  core: CoreStart;
  authc: AuthenticationServiceSetup;
}

export class SecurityNavControlService {
  private securityLicense!: SecurityLicense;
  private logoutUrl!: string;
  private securityApiClients!: SecurityApiClients;

  private navControlRegistered!: boolean;
  private versionSwitcherRegistered!: boolean;
  private headerNavControlElement?: HTMLElement;
  private headerNavControlUnmount?: () => void;

  private securityFeaturesSubscription?: Subscription;
  private versionSubscription?: Subscription;
  private core?: CoreStart;
  private authc?: AuthenticationServiceSetup;

  private readonly stop$ = new ReplaySubject<void>(1);
  private userMenuLinks$ = new BehaviorSubject<UserMenuLink[]>([]);

  public setup({ securityLicense, logoutUrl, securityApiClients }: SetupDeps) {
    this.securityLicense = securityLicense;
    this.logoutUrl = logoutUrl;
    this.securityApiClients = securityApiClients;
  }

  public start({ core, authc }: StartDeps): SecurityNavControlServiceStart {
    this.core = core;
    this.authc = authc;

    this.securityFeaturesSubscription = this.securityLicense.features$.subscribe(
      ({ showLinks }) => {
        const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);

        const shouldRegisterNavControl =
          !isAnonymousPath && showLinks && !this.navControlRegistered;
        if (shouldRegisterNavControl) {
          this.registerSecurityNavControl(core, authc);
        }
      }
    );

    // Subscribe to version changes and update nav controls accordingly
    this.versionSubscription = version$.subscribe((version) => {
      if (this.navControlRegistered && this.core && this.authc) {
        this.updateNavControlsForVersion(version);
      }
    });

    return {
      getUserMenuLinks$: () =>
        this.userMenuLinks$.pipe(map(this.sortUserMenuLinks), takeUntil(this.stop$)),
      addUserMenuLinks: (userMenuLinks: UserMenuLink[]) => {
        const currentLinks = this.userMenuLinks$.value;
        const hasCustomProfileLink = currentLinks.find(({ setAsProfile }) => setAsProfile === true);
        const passedCustomProfileLinkCount = userMenuLinks.filter(
          ({ setAsProfile }) => setAsProfile === true
        ).length;

        if (hasCustomProfileLink && passedCustomProfileLinkCount > 0) {
          throw new Error(
            `Only one custom profile link can be set. A custom profile link named ${hasCustomProfileLink.label} (${hasCustomProfileLink.href}) already exists`
          );
        }

        if (passedCustomProfileLinkCount > 1) {
          throw new Error(
            `Only one custom profile link can be passed at a time (found ${passedCustomProfileLinkCount})`
          );
        }

        const newLinks = [...currentLinks, ...userMenuLinks];
        this.userMenuLinks$.next(newLinks);
      },
    };
  }

  public stop() {
    if (this.securityFeaturesSubscription) {
      this.securityFeaturesSubscription.unsubscribe();
      this.securityFeaturesSubscription = undefined;
    }
    if (this.versionSubscription) {
      this.versionSubscription.unsubscribe();
      this.versionSubscription = undefined;
    }
    this.unregisterNavControls();
    this.navControlRegistered = false;
    this.stop$.next();
  }

  private updateNavControlsForVersion(version: 'current' | '1.1' | '1.2') {
    if (!this.core || !this.authc || !this.headerNavControlElement) return;

    this.renderHeaderNavControl(this.headerNavControlElement, version);

    if (version === 'current') {
      this.core.chrome.sideNav.setFooterUserMenu(undefined);
    } else {
      // Versions 1.1 and 1.2 both use footer menu
      const footerMenu = this.core.rendering.addContext(
        <VersionProvider>
          <Providers
            services={this.core}
            authc={this.authc}
            securityApiClients={this.securityApiClients}
          >
            <FooterUserMenu
              editProfileUrl={this.core.http.basePath.prepend('/security/account')}
              logoutUrl={this.logoutUrl}
              userMenuLinks$={this.userMenuLinks$}
            />
          </Providers>
        </VersionProvider>
      );
      this.core.chrome.sideNav.setFooterUserMenu(footerMenu);
    }
  }

  private registerSecurityNavControl(
    core: CoreStart,
    authc: AuthenticationServiceSetup,
    version?: 'current' | '1.1' | '1.2'
  ) {
    const currentVersion = version ?? version$.value;

    // Register version switcher (always visible, only once)
    if (!this.versionSwitcherRegistered) {
      core.chrome.navControls.registerRight({
        order: 1,
        mount: (element: HTMLElement) => {
          ReactDOM.render(
            core.rendering.addContext(
              <VersionProvider>
                <VersionSwitcher />
              </VersionProvider>
            ),
            element,
            () => {}
          );

          return () => {
            ReactDOM.unmountComponentAtNode(element);
          };
        },
      });
      this.versionSwitcherRegistered = true;
    }

    // Register header nav control (will be shown/hidden based on version)
    core.chrome.navControls.registerRight({
      order: 4000,
      mount: (element: HTMLElement) => {
        this.headerNavControlElement = element;
        this.renderHeaderNavControl(element, currentVersion);

        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    // Set initial footer menu based on version
    if (currentVersion === 'current') {
      core.chrome.sideNav.setFooterUserMenu(undefined);
    } else {
      const footerMenu = core.rendering.addContext(
        <VersionProvider>
          <Providers services={core} authc={authc} securityApiClients={this.securityApiClients}>
            <FooterUserMenu
              editProfileUrl={core.http.basePath.prepend('/security/account')}
              logoutUrl={this.logoutUrl}
              userMenuLinks$={this.userMenuLinks$}
            />
          </Providers>
        </VersionProvider>
      );
      core.chrome.sideNav.setFooterUserMenu(footerMenu);
    }

    this.navControlRegistered = true;
  }

  private renderHeaderNavControl(element: HTMLElement, version: 'current' | '1.1' | '1.2') {
    if (!this.core || !this.authc) return;

    if (version === 'current') {
      ReactDOM.render(
        this.core.rendering.addContext(
          <VersionProvider>
            <Providers
              services={this.core}
              authc={this.authc}
              securityApiClients={this.securityApiClients}
            >
              <SecurityNavControl
                editProfileUrl={this.core.http.basePath.prepend('/security/account')}
                logoutUrl={this.logoutUrl}
                userMenuLinks$={this.userMenuLinks$}
              />
            </Providers>
          </VersionProvider>
        ),
        element,
        () => {}
      );
      this.headerNavControlUnmount = () => {
        ReactDOM.unmountComponentAtNode(element);
      };
    } else {
      // Render empty div for versions 1.1 and 1.2 (footer menu will be shown instead)
      ReactDOM.render(<div />, element, () => {});
      this.headerNavControlUnmount = () => {
        ReactDOM.unmountComponentAtNode(element);
      };
    }
  }

  private sortUserMenuLinks(userMenuLinks: UserMenuLink[]) {
    return sortBy(userMenuLinks, 'order');
  }
}

export interface ProvidersProps {
  authc: AuthenticationServiceSetup;
  services: CoreStart;
  securityApiClients: SecurityApiClients;
}

export const Providers: FC<PropsWithChildren<ProvidersProps>> = ({
  authc,
  services,
  securityApiClients,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <AuthenticationProvider authc={authc}>
      <SecurityApiClientsProvider {...securityApiClients}>
        <UserProfilesKibanaProvider
          core={services}
          security={{
            userProfiles: securityApiClients.userProfiles,
          }}
          toMountPoint={toMountPoint}
        >
          <RedirectAppLinks coreStart={services}>{children}</RedirectAppLinks>
        </UserProfilesKibanaProvider>
      </SecurityApiClientsProvider>
    </AuthenticationProvider>
  </KibanaContextProvider>
);
