import type { MappedEmbeddableTypeOf, MlEmbeddableTypes } from '../../../embeddables';
/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export declare const useCasesModal: <EmbeddableType extends MlEmbeddableTypes>(embeddableType: EmbeddableType, title: string) => (state: Partial<Omit<MappedEmbeddableTypeOf<EmbeddableType>, "id">>) => void;
