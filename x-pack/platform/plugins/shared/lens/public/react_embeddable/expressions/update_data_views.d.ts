import type { LensRuntimeState } from '@kbn/lens-common';
import type { LensEmbeddableStartServices } from '../types';
export declare function getUsedDataViews(references: LensRuntimeState['attributes']['references'], adHocDataViewsSpecs: LensRuntimeState['attributes']['state']['adHocDataViews'], dataViews: LensEmbeddableStartServices['dataViews']): Promise<import("@kbn/data-views-plugin/common").DataView[]>;
