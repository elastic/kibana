import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { IndexPatternMap, IndexPatternRef, SharingSavedObjectProps, UserMessage } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { MergedSearchContext } from '../expressions/merged_search_context';
export declare function hasLegacyURLConflict(metaInfo?: SharingSavedObjectProps, spaces?: SpacesApi): false | import("@kbn/spaces-plugin/public").LazyComponentFn<import("@kbn/spaces-plugin/public").EmbeddableLegacyUrlConflictProps> | undefined;
export declare function getLegacyURLConflictsMessage(metaInfo: SharingSavedObjectProps, spaces: SpacesApi): UserMessage;
export declare function isSearchContextIncompatibleWithDataViews(api: LensApi, context: {
    type?: string;
    id?: string;
} | undefined, searchContext: MergedSearchContext, indexPatternRefs: IndexPatternRef[], indexPatterns: IndexPatternMap): boolean;
export declare function getSearchContextIncompatibleMessage(): UserMessage;
