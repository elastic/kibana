import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '@kbn/es-query';
export declare function showPatternAnalysisToADJobFlyout(dataView: DataView, field: DataViewField, query: QueryDslQueryContainer, timeRange: TimeRange, coreStart: CoreStart, share: SharePluginStart, data: DataPublicPluginStart, dashboardService: DashboardStart, lens?: LensPublicStart): Promise<void>;
