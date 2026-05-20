import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { LensApi, LensWireAPIConfig } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from './types';
export declare const createLensEmbeddableFactory: (services: LensEmbeddableStartServices) => EmbeddablePublicDefinition<LensWireAPIConfig, LensApi>;
