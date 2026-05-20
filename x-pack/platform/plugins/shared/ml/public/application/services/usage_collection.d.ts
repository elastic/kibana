import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlUsageEvent } from '../../../common/constants/usage_collection';
import type { CustomRuleEditorOpenedEventName } from '../../../common/util/usage_collection';
type MlCountEvent = MlUsageEvent | MlUsageEvent[] | CustomRuleEditorOpenedEventName | CustomRuleEditorOpenedEventName[];
export declare function mlUsageCollectionProvider(usageCollection?: UsageCollectionSetup): {
    click: (eventNames: MlUsageEvent | MlUsageEvent[], count?: number) => void;
    count: (eventNames: MlCountEvent, count?: number) => void;
};
export type MlPublicUsageCollection = ReturnType<typeof mlUsageCollectionProvider>;
export {};
