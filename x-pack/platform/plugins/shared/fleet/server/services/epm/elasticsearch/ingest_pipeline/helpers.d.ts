import type { RegistryDataStream } from '../../../../types';
import type { PipelineInstall, RewriteSubstitution } from './types';
export declare const isTopLevelPipeline: (path: string) => boolean;
export declare const getPipelineNameForInstallation: ({ pipelineName, dataStream, packageVersion, }: {
    pipelineName: string;
    dataStream?: RegistryDataStream;
    packageVersion: string;
}) => string;
export declare function rewriteIngestPipeline(pipeline: string, substitutions: RewriteSubstitution[]): string;
export declare function addCustomPipelineAndLocalRoutingRulesProcessor(pipeline: PipelineInstall): PipelineInstall;
