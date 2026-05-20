import type { LensSerializedState } from '@kbn/lens-common';
import type { LensEmbeddableStartServices } from './types';
export type ESQLStartServices = Pick<LensEmbeddableStartServices, 'dataViews' | 'data' | 'visualizationMap' | 'datasourceMap' | 'uiSettings' | 'coreStart'>;
export declare function loadESQLAttributes({ dataViews, data, visualizationMap, datasourceMap, uiSettings, coreStart, }: ESQLStartServices): Promise<LensSerializedState['attributes'] | undefined>;
