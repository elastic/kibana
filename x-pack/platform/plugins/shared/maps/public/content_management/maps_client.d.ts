import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { VisualizationClient } from '@kbn/visualizations-plugin/public/vis_types/vis_type_alias_registry';
import type { MapAttributes } from '../../server';
export declare function getMapClient(cm?: ContentManagementPublicStart): VisualizationClient<'map', MapAttributes>;
