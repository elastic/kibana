import type { VisualizationStage } from '@kbn/visualizations-plugin/public';
import type { MapItem } from '../common/content_management';
import { getMapClient } from './content_management';
export declare const mapsVisTypeAlias: {
    alias: {
        app: string;
        path: string;
    };
    name: string;
    title: string;
    description: string;
    icon: string;
    stage: VisualizationStage;
    order: number;
    appExtensions: {
        visualizations: {
            docTypes: string[];
            searchFields: string[];
            client: typeof getMapClient;
            toListItem(mapItem: MapItem): {
                id: string;
                title: string;
                description: string | undefined;
                updatedAt: string | undefined;
                managed: boolean | undefined;
                editor: {
                    editUrl: string;
                    editApp: string;
                };
                icon: string;
                stage: VisualizationStage;
                savedObjectType: string;
                typeTitle: string;
            };
        };
    };
};
