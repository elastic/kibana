/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
import { IScope } from 'angular';
import { PathReporter } from 'io-ts/lib/PathReporter';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { UIRoutes } from 'ui/routes';
import { isLeft } from 'fp-ts/lib/Either';
import { npSetup } from 'ui/new_platform';
import { ManagementSectionId } from '../../../../../../../../src/plugins/management/public';
import { SecurityPluginSetup } from '../../../../../../../plugins/security/public';
import { BufferedKibanaServiceCall, KibanaAdapterServiceRefs, KibanaUIConfig } from '../../types';
import { BASE_PATH } from '../../../../common/constants';
import {
  FrameworkAdapter,
  FrameworkInfo,
  FrameworkUser,
  ManagementAPI,
  RuntimeFrameworkInfo,
  RuntimeFrameworkUser,
} from './adapter_types';
interface IInjector {
  get(injectable: string): any;
}

export class KibanaFrameworkAdapter implements FrameworkAdapter {
  public get info() {
    if (this.xpackInfo) {
      return this.xpackInfo;
    } else {
      throw new Error('framework adapter must have init called before anything else');
    }
  }

  public get currentUser() {
    return this.shieldUser!;
  }
  private xpackInfo: FrameworkInfo | null = null;
  private adapterService: KibanaAdapterServiceProvider;
  private shieldUser: FrameworkUser | null = null;
  constructor(
    private readonly PLUGIN_ID: string,
    private readonly management: ManagementAPI,
    private readonly routes: UIRoutes,
    private readonly getBasePath: () => string,
    private readonly onKibanaReady: () => Promise<IInjector>,
    private readonly xpackInfoService: any | null,
    public readonly version: string
  ) {
    this.adapterService = new KibanaAdapterServiceProvider();
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public async waitUntilFrameworkReady(): Promise<void> {
    await this.onKibanaReady();
    const xpackInfo: any = this.xpackInfoService;
    let xpackInfoUnpacked: FrameworkInfo;

    try {
      xpackInfoUnpacked = {
        basePath: this.getBasePath(),
        license: {
          type: xpackInfo ? xpackInfo.getLicense().type : 'oss',
          expired: xpackInfo ? !xpackInfo.getLicense().isActive : false,
          expiry_date_in_millis:
            xpackInfo.getLicense().expiryDateInMillis !== undefined
              ? xpackInfo.getLicense().expiryDateInMillis
              : -1,
        },
        security: {
          enabled: xpackInfo
            ? xpackInfo.get(`features.${this.PLUGIN_ID}.security.enabled`, false)
            : false,
          available: xpackInfo
            ? xpackInfo.get(`features.${this.PLUGIN_ID}.security.available`, false)
            : false,
        },
        settings: xpackInfo ? xpackInfo.get(`features.${this.PLUGIN_ID}.settings`) : {},
      };
    } catch (e) {
      throw new Error(`Unexpected data structure from xpackInfoService, ${JSON.stringify(e)}`);
    }

    const assertData = RuntimeFrameworkInfo.decode(xpackInfoUnpacked);
    if (isLeft(assertData)) {
      throw new Error(
        `Error parsing xpack info in ${this.PLUGIN_ID},   ${PathReporter.report(assertData)[0]}`
      );
    }
    this.xpackInfo = xpackInfoUnpacked;

    const securitySetup = ((npSetup.plugins as unknown) as { security?: SecurityPluginSetup })
      .security;
    try {
      this.shieldUser = (await securitySetup?.authc.getCurrentUser()) || null;
      const assertUser = RuntimeFrameworkUser.decode(this.shieldUser);

      if (isLeft(assertUser)) {
        throw new Error(
          `Error parsing user info in ${this.PLUGIN_ID},   ${PathReporter.report(assertUser)[0]}`
        );
      }
    } catch (e) {
      this.shieldUser = null;
    }
  }

  public renderUIAtPath(
    path: string,
    component: React.ReactElement<any>,
    toController: 'management' | 'self' = 'self'
  ) {
    const adapter = this;
    this.routes.when(
      `${path}${[...Array(6)].map((e, n) => `/:arg${n}?`).join('')}`, // Hack because angular 1 does not support wildcards
      {
        template:
          toController === 'self'
            ? `<${this.PLUGIN_ID}><div id="${this.PLUGIN_ID}ReactRoot"></div></${this.PLUGIN_ID}>`
            : `<kbn-management-app section="${this.PLUGIN_ID.replace('_', '-')}">
                <div id="management-sidenav" class="euiPageSideBar" style="position: static;"></div>
                <div id="${this.PLUGIN_ID}ReactRoot" />
               </kbn-management-app>`,
        // eslint-disable-next-line max-classes-per-file
        controller: ($scope: any, $route: any) => {
          try {
            $scope.$$postDigest(() => {
              const elem = document.getElementById(`${this.PLUGIN_ID}ReactRoot`);
              ReactDOM.render(component, elem);
              adapter.manageAngularLifecycle($scope, $route, elem);
            });
            $scope.$onInit = () => {
              $scope.topNavMenu = [];
            };
          } catch (e) {
            throw new Error(`Error rendering Beats CM to the dom, ${e.message}`);
          }
        },
      }
    );
  }

  public registerManagementSection() {
    this.management.getSection(ManagementSectionId.Ingest).register('beats_central_management', {
      display: i18n.translate('xpack.beatsManagement.centralManagementSectionLabel', {
        defaultMessage: 'Beats Central Management',
      }),
      order: 2,
      visible: true,
      url: `#${BASE_PATH}/`,
    });
  }

  private manageAngularLifecycle($scope: any, $route: any, elem: any) {
    const lastRoute = $route.current;
    const deregister = $scope.$on('$locationChangeSuccess', () => {
      const currentRoute = $route.current;
      // if templates are the same we are on the same route
      if (lastRoute.$$route.template === currentRoute.$$route.template) {
        // this prevents angular from destroying scope
        $route.current = lastRoute;
      } else {
        if (elem) {
          ReactDOM.unmountComponentAtNode(elem);
          elem.remove();
        }
      }
    });
    $scope.$on('$destroy', () => {
      if (deregister) {
        deregister();
      }

      // manually unmount component when scope is destroyed
      if (elem) {
        ReactDOM.unmountComponentAtNode(elem);
        elem.remove();
      }
    });
  }
}

class KibanaAdapterServiceProvider {
  public serviceRefs: KibanaAdapterServiceRefs | null = null;
  public bufferedCalls: Array<BufferedKibanaServiceCall<KibanaAdapterServiceRefs>> = [];

  public $get($rootScope: IScope, config: KibanaUIConfig) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: KibanaAdapterServiceRefs) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(
    bufferedCalls: Array<BufferedKibanaServiceCall<KibanaAdapterServiceRefs>>
  ) {
    if (!this.serviceRefs) {
      return;
    }

    this.serviceRefs.rootScope.$apply(() => {
      bufferedCalls.forEach(serviceCall => {
        if (!this.serviceRefs) {
          return;
        }
        return serviceCall(this.serviceRefs);
      });
    });
  }
}
