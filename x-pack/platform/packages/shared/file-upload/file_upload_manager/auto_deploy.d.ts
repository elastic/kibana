import type { HttpSetup } from '@kbn/core/public';
export declare class AutoDeploy {
    private readonly http;
    private readonly inferenceId;
    private inferError;
    private inferFinished;
    constructor(http: HttpSetup, inferenceId: string);
    deploy(signal?: AbortSignal): Promise<void>;
    private infer;
    private isDeployed;
    private pollIsDeployed;
}
