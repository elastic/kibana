import type { PackageInfo, PackagePolicyConfigRecord, PackagePolicyInput, PackagePolicyInputStream } from '../../../../common/types';
export declare function getMetaVariables(pkg: Pick<PackageInfo, 'name' | 'title' | 'version'>, input: PackagePolicyInput, stream?: PackagePolicyInputStream, agentVersion?: string): {
    package: {
        name: string;
        title: string;
        version: string;
    };
    stream: {
        id: string;
        data_stream: {
            dataset: string;
            type: string;
        };
    };
    input: {
        id: string;
    };
    agent: {
        version: string | undefined;
    };
};
export type MetaVariable = ReturnType<typeof getMetaVariables>;
/**
 * Merges two compiled template objects following these rules:
 * - Scalars: override wins.
 * - Maps (plain objects): deep-merged recursively.
 * - Arrays: base elements first, override appended.
 */
export declare function mergeCompiledTemplates(base: Record<string, any>, override: Record<string, any>): Record<string, any>;
export declare function compileTemplate(variables: PackagePolicyConfigRecord, metaVariable: MetaVariable, templateStr: string): any;
