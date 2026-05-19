import type { Reference } from '@kbn/content-management-utils';
import type { MapAttributes, StoredMapAttributes } from '../../server';
export declare function transformMapAttributesOut(storedMapAttributes: StoredMapAttributes, findReference: (name: string) => Reference | undefined): MapAttributes;
