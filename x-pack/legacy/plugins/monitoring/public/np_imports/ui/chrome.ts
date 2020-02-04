/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
import { npStart, npSetup } from '../legacy_imports';

type OptionalInjector = void | angular.auto.IInjectorService;

class Chrome {
  private injector?: OptionalInjector;

  public setInjector = (injector: OptionalInjector): void => void (this.injector = injector);
  public dangerouslyGetActiveInjector = (): OptionalInjector => this.injector;

  public getBasePath = (): string => npStart.core.http.basePath.get();

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
