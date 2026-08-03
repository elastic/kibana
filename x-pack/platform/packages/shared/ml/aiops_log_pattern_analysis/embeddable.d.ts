import type { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
export interface EmbeddablePatternAnalysisInput {
    dataView: DataView;
    savedSearch?: Pick<SavedSearch, 'searchSource'> | null;
    embeddingOrigin?: string;
    switchToDocumentView?: () => Promise<VIEW_MODE>;
    lastReloadRequestTime?: number;
}
