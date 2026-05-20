import { type ComposerQueryTagHole, type ComposerSortShorthand } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from './query_utils';
export type LatestSourceWhereCondition = ESQLAstExpression & ComposerQueryTagHole;
interface RunLatestSourceEsqlQueryArgs {
    esClient: ElasticsearchClient;
    space: string;
    options: CommonSearchOptions;
    index: string;
    where?: LatestSourceWhereCondition;
    sort?: ComposerSortShorthand[];
    groupBy: string;
}
export declare const runLatestSourceEsqlQuery: <T>({ esClient, space, options, index, where, sort, groupBy, }: RunLatestSourceEsqlQueryArgs) => Promise<{
    hits: T[];
}>;
export {};
