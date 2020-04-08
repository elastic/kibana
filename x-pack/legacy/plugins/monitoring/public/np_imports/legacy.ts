

import { CoreStart } from 'kibana/public';
import angular from 'angular';
import { HttpRequestInit } from '../../../../../../src/core/public/http/types'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { DataPublicPluginStart } from 'src/plugins/data/public';

export interface KFetchQuery {
  [key: string]: string | number | boolean | undefined
}

export interface KFetchOptions extends HttpRequestInit {
  pathname: string
  query?: KFetchQuery
  asSystemRequest?: boolean
}

export interface KFetchKibanaOptions {
  prependBasePath?: boolean;
}

export interface IShims {
  toastNotifications: CoreStart['notifications']['toasts']
  capabilities: { get: () => CoreStart['application']['capabilities'] }
  getAngularInjector: () => angular.auto.IInjectorService
  getBasePath: () => string
  getInjected: (name: string, defaultValue?: unknown) => unknown
  breadcrumbs: { set: () => void }
  I18nContext: CoreStart['i18n']['Context']
  docLinks: CoreStart['docLinks']
  docTitle: CoreStart['chrome']['docTitle']
  timefilter: DataPublicPluginStart['query']['timefilter'] | null;
  kfetch: ({ pathname, ...options }: KFetchOptions, kfetchOptions?: KFetchKibanaOptions | undefined) => Promise<any>
  isCloud: boolean
}

export class Legacy {

  private static _shims: IShims;

  public static init(coreStart: CoreStart, timefilter: IShims['timefilter'], ngInjector: angular.auto.IInjectorService, isCloud: boolean) {
    this._shims = {
      toastNotifications: coreStart.notifications.toasts,
      capabilities: { get: () => coreStart.application.capabilities },
      getAngularInjector: (): angular.auto.IInjectorService => ngInjector,
      getBasePath: (): string => coreStart.http.basePath.get(),
      getInjected: (name: string, defaultValue?: unknown): string | unknown => coreStart.injectedMetadata.getInjectedVar(name, defaultValue),
      breadcrumbs: {
        set: (...args: any[0]) => coreStart.chrome.setBreadcrumbs.apply(this, args),
      },
      I18nContext: coreStart.i18n.Context,
      docLinks: coreStart.docLinks,
      docTitle: coreStart.chrome.docTitle,
      timefilter,
      kfetch: async (
        { pathname, ...options }: KFetchOptions,
        kfetchOptions?: KFetchKibanaOptions
      ) =>
        await coreStart.http.fetch(pathname, {
          prependBasePath: kfetchOptions?.prependBasePath,
          ...options,
        }),
      isCloud,
    }
  }

  public static get shims(): Readonly<IShims> {
    if (!Legacy._shims) {
      throw new Error('Legacy needs to be initiated with Legacy.init(...) before use');
    }
    return Legacy._shims;
  }

}
