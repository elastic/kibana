/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
import { npStart, npSetup } from '../legacy_imports';

class Chrome {
  private getRootElement = (): Promise<HTMLElement> => {
    return new Promise(resolve => {
      const element = document.getElementById('monitoring-angular-app');
      if (element) {
        resolve(element);
      } else {
        setTimeout(() => resolve(this.getRootElement()), 100);
      }
    });
  };

  public dangerouslyGetActiveInjector = async (): Promise<angular.auto.IInjectorService> => {
    const targetDomElement: HTMLElement = await this.getRootElement();
    const $injector = angular.element(targetDomElement).injector();
    if (!$injector) {
      return Promise.reject('targetDomElement had no angular context after bootstrapping');
    }
    return Promise.resolve($injector);
  };

  public getBasePath = (): string => {
    return npStart.core.http.basePath.get();
  };

  public getInjected = (name?: string, defaultValue?: any): string | unknown => {
    const { getInjectedVar, getInjectedVars } = npSetup.core.injectedMetadata;
    return name ? getInjectedVar(name, defaultValue) : getInjectedVars();
  };

  public get breadcrumbs() {
    const set = (...args: any[]) => npStart.core.chrome.setBreadcrumbs.apply(this, args as any);
    return { set };
  }
}

const chrome = new Chrome();

export default chrome; // eslint-disable-line import/no-default-export
