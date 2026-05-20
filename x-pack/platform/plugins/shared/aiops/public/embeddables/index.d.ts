import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { AiopsCoreSetup } from '../types';
export declare const registerEmbeddables: (embeddable: EmbeddableSetup, getStartServices: AiopsCoreSetup["getStartServices"]) => void;
