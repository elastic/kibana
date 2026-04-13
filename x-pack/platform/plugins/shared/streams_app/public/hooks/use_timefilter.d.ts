import type { TimefilterContract, TimefilterHook } from '@kbn/data-plugin/public';
export declare function useTimefilter(): TimefilterHook & {
    setTime: TimefilterContract['setTime'];
};
