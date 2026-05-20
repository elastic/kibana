import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { LensPluginStartDependencies } from '../plugin';
export declare function getAddLensPanelAction(deps: LensPluginStartDependencies): {
    id: string;
    getIconType: () => string;
    order: number | undefined;
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
