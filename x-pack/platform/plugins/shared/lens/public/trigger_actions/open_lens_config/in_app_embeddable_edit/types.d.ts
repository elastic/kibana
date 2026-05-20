import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { TypedLensByValueInput } from '@kbn/lens-common';
export interface LensChartLoadEvent {
    /**
     * Inspector adapters for the request
     */
    adapters: Partial<DefaultInspectorAdapters>;
    /**
     * Observable to track embeddable loading state
     */
    dataLoading$?: PublishingSubject<boolean | undefined>;
}
export interface InlineEditLensEmbeddableContext {
    attributes: TypedLensByValueInput['attributes'];
    lensEvent: LensChartLoadEvent;
    onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => void;
    onApply?: (newAttributes: TypedLensByValueInput['attributes']) => void;
    onCancel?: () => void;
    container?: HTMLElement | null;
    applyButtonLabel?: string;
}
