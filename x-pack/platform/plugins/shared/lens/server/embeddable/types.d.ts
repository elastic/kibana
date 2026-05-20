import type { EmbeddableRegistryDefinition, EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import type { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { LensRuntimeState } from '../../public';
export type LensEmbeddableStateWithType = EmbeddableStateWithType & LensRuntimeState & {
    type: typeof LENS_EMBEDDABLE_TYPE;
};
export type LensEmbeddableRegistryDefinition = EmbeddableRegistryDefinition<LensEmbeddableStateWithType>;
