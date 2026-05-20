import type { CoreStart } from '@kbn/core/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
export declare class AddESQLPanelAction implements Action<EmbeddableApiContext> {
    protected readonly core: CoreStart;
    type: string;
    id: string;
    order: number;
    grouping: {
        id: string;
        getDisplayName: () => string;
        getIconType: () => string;
        order: number;
    }[];
    constructor(core: CoreStart);
    getDisplayName(): string;
    getIconType(): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<any>;
    execute({ embeddable: api }: EmbeddableApiContext): Promise<void>;
}
