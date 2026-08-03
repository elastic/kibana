import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { MapsPluginStartDependencies } from '../plugin';
export declare function getAddMapPanelAction(deps: MapsPluginStartDependencies): {
    id: string;
    getIconType: () => string;
    order: number;
    isCompatible: () => Promise<boolean>;
    execute: ({ embeddable }: EmbeddableApiContext) => Promise<void>;
    grouping: {
        id: string;
        getDisplayName: () => string;
        getIconType: () => string;
        order: number;
    }[];
    getDisplayName: () => string;
    getDisplayNameTooltip: () => string;
};
