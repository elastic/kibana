import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
export declare function getRuleTypes({ http }: {
    http: HttpStart;
}): Promise<RuleType[]>;
