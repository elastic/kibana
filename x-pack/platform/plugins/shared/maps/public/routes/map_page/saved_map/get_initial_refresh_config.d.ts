import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { MapAttributes } from '../../../../server';
export declare function getInitialRefreshConfig({ mapState, globalState, }: {
    mapState?: MapAttributes;
    globalState: GlobalQueryStateFromUrl;
}): any;
