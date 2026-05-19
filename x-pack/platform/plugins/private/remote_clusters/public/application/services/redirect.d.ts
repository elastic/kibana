import type { CoreStart } from '@kbn/core/public';
export declare function init(_navigateToApp: CoreStart['application']['navigateToApp']): void;
export declare function redirect(path: string): void;
