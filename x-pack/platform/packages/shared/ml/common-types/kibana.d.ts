import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
export type IndexPatternTitle = string;
export interface Route {
    id: string;
    k7Breadcrumbs: () => any;
}
export type FieldFormatsRegistryProvider = () => Promise<FieldFormatsRegistry>;
