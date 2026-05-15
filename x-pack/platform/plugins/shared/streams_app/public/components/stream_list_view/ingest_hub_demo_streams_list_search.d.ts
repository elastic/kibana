import type { EuiThemeComputed, Query } from '@elastic/eui';
import type { AwsMockStreamRow } from './ingest_hub_demo_streams_model';
/** No collapsed parents — use for views that always show the full tree (e.g. canvas). */
export declare const MOCK_AWS_STREAMS_LIST_FULLY_EXPANDED: ReadonlySet<string>;
export declare function filterMockAwsStreamsBySearchQuery(rows: readonly AwsMockStreamRow[], searchQuery: Query | undefined, collapsed: ReadonlySet<string>): AwsMockStreamRow[];
export declare function streamsDemoSearchToolbarLayoutCss(euiTheme: EuiThemeComputed): string;
