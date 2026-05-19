import type { HttpStart } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SerializableAttributes, BasicVisualizationClient } from '@kbn/visualizations-plugin/public';
/**
 * This is a wrapper client used only to update basic attributes from the vis plugin
 */
export declare function getLensBasicClient<Attr extends SerializableAttributes = SerializableAttributes>(_: ContentManagementPublicStart, http: HttpStart): BasicVisualizationClient<'lens', Attr>;
