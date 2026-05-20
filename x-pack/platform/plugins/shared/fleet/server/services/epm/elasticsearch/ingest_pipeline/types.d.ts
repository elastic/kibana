import type { RegistryDataStream } from '../../../../types';
export interface PipelineInstall {
    nameForInstallation: string;
    contentForInstallation: string;
    shouldInstallCustomPipelines?: boolean;
    extension: string;
    dataStream?: RegistryDataStream;
}
export interface RewriteSubstitution {
    source: string;
    target: string;
    templateFunction: string;
}
