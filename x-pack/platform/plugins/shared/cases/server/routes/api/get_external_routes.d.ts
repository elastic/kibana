import type { DocLinksServiceSetup } from '@kbn/core/server';
import type { CaseRoute } from './types';
export declare const getExternalRoutes: ({ isServerless, docLinks, }: {
    isServerless?: boolean;
    docLinks: DocLinksServiceSetup;
}) => CaseRoute[];
