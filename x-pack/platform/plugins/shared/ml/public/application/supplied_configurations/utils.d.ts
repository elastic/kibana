import type { Clause } from '@elastic/eui/src/components/search_bar/query/ast';
import type { Module } from '@kbn/ml-common-types/modules';
export declare function filterModules(items: Module[], clauses: Clause[]): Module[];
