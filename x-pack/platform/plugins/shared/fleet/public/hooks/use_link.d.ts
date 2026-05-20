import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../constants';
export declare const useLink: () => {
    getPath: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
    getAbsolutePath: (path: string) => string;
    getAssetsPath: (path: string) => string;
    getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
};
