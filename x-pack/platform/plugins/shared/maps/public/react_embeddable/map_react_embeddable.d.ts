import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { MapApi } from './types';
import type { MapEmbeddableState } from '../../common';
export declare function getControlledBy(id: string): string;
export declare const mapEmbeddableFactory: EmbeddableFactory<MapEmbeddableState, MapApi>;
