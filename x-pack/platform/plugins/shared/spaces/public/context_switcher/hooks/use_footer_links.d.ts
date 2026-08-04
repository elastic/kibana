import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { LinksListItem } from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import type { Space } from '../../../common';
export declare const useFooterLinks: ({ application, cloud, isServerless, activeSpaceSolution, }: {
    application: CoreStart["application"];
    cloud?: CloudStart;
    isServerless?: boolean;
    activeSpaceSolution?: Space["solution"];
}) => LinksListItem[];
