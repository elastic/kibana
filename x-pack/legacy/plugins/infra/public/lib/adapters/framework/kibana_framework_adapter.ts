/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { IModule, IScope } from 'angular';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { UIRoutes as KibanaUIRoutes } from 'ui/routes';

import {
  InfraBufferedKibanaServiceCall,
  InfraFrameworkAdapter,
  InfraKibanaAdapterServiceRefs,
  InfraKibanaUIConfig,
  InfraTimezoneProvider,
  InfraUiKibanaAdapterScope,
} from '../../lib';

const ROOT_ELEMENT_ID = 'react-infra-root';
const BREADCRUMBS_ELEMENT_ID = 'react-infra-breadcrumbs';

export class KibanaFramework implements InfraFrameworkAdapter {
  public appState: object;
  public kbnVersion?: string;
  public timezone?: string;

  private adapterService: KibanaAdapterServiceProvider;
  private timezoneProvider: InfraTimezoneProvider;
  private rootComponent: React.ReactElement<any> | null = null;
  private breadcrumbsComponent: React.ReactElement<any> | null = null;

  constructor(
    uiModule: IModule,
    uiRoutes: KibanaUIRoutes,
    timezoneProvider: InfraTimezoneProvider
  ) {
    this.adapterService = new KibanaAdapterServiceProvider();
    this.timezoneProvider = timezoneProvider;
    this.appState = {};
    this.register(uiModule, uiRoutes);
  }

  public setUISettings = (key: string, value: any) => {
    this.adapterService.callOrBuffer(({ config }) => {
      config.set(key, value);
    });
  };

  public render = (component: React.ReactElement<any>) => {
    this.adapterService.callOrBuffer(() => (this.rootComponent = component));
  };

  public renderBreadcrumbs = (component: React.ReactElement<any>) => {
    this.adapterService.callOrBuffer(() => (this.breadcrumbsComponent = component));
  };

  private register = (adapterModule: IModule, uiRoutes: KibanaUIRoutes) => {
    adapterModule.provider('kibanaAdapter', this.adapterService);

    adapterModule.directive('infraUiKibanaAdapter', () => ({
      controller: ($scope: InfraUiKibanaAdapterScope, $element: JQLite) => ({
        $onDestroy: () => {
          const targetRootElement = $element[0].querySelector(`#${ROOT_ELEMENT_ID}`);
          const targetBreadcrumbsElement = $element[0].querySelector(`#${ROOT_ELEMENT_ID}`);

          if (targetRootElement) {
            ReactDOM.unmountComponentAtNode(targetRootElement);
          }

          if (targetBreadcrumbsElement) {
            ReactDOM.unmountComponentAtNode(targetBreadcrumbsElement);
          }
        },
        $onInit: () => {
          $scope.topNavMenu = [];
        },
        $postLink: () => {
          $scope.$watchGroup(
            [
              () => this.breadcrumbsComponent,
              () => $element[0].querySelector(`#${BREADCRUMBS_ELEMENT_ID}`),
            ],
            ([breadcrumbsComponent, targetElement]) => {
              if (!targetElement) {
                return;
              }

              if (breadcrumbsComponent) {
                ReactDOM.render(breadcrumbsComponent, targetElement);
              } else {
                ReactDOM.unmountComponentAtNode(targetElement);
              }
            }
          );
          $scope.$watchGroup(
            [() => this.rootComponent, () => $element[0].querySelector(`#${ROOT_ELEMENT_ID}`)],
            ([rootComponent, targetElement]) => {
              if (!targetElement) {
                return;
              }

              if (rootComponent) {
                ReactDOM.render(rootComponent, targetElement);
              } else {
                ReactDOM.unmountComponentAtNode(targetElement);
              }
            }
          );
        },
      }),
      scope: true,
      template: `
        <main
          id="${ROOT_ELEMENT_ID}"
          class="infReactRoot"
        ></main>
      `,
    }));

    adapterModule.run(
      (
        config: InfraKibanaUIConfig,
        kbnVersion: string,
        Private: <Provider>(provider: Provider) => Provider,
        // @ts-ignore: inject kibanaAdapter to force eager instatiation
        kibanaAdapter: any
      ) => {
        this.timezone = Private(this.timezoneProvider)();
        this.kbnVersion = kbnVersion;
      }
    );

    uiRoutes.enable();

    uiRoutes.otherwise({
      reloadOnSearch: false,
      template:
        '<infra-ui-kibana-adapter style="display: flex; align-items: stretch; flex: 1 0 0%;"></infra-ui-kibana-adapter>',
    });
  };
}

class KibanaAdapterServiceProvider {
  public serviceRefs: InfraKibanaAdapterServiceRefs | null = null;
  public bufferedCalls: Array<InfraBufferedKibanaServiceCall<InfraKibanaAdapterServiceRefs>> = [];

  public $get($rootScope: IScope, config: InfraKibanaUIConfig) {
    this.serviceRefs = {
      config,
      rootScope: $rootScope,
    };

    this.applyBufferedCalls(this.bufferedCalls);

    return this;
  }

  public callOrBuffer(serviceCall: (serviceRefs: InfraKibanaAdapterServiceRefs) => void) {
    if (this.serviceRefs !== null) {
      this.applyBufferedCalls([serviceCall]);
    } else {
      this.bufferedCalls.push(serviceCall);
    }
  }

  public applyBufferedCalls(
    bufferedCalls: Array<InfraBufferedKibanaServiceCall<InfraKibanaAdapterServiceRefs>>
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
