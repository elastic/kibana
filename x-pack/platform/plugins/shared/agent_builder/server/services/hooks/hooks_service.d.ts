import type { Logger } from '@kbn/logging';
import type { HooksServiceSetup, HooksServiceStart } from '@kbn/agent-builder-server';
export interface HooksServiceSetupDeps {
    logger: Logger;
}
export declare class HooksService {
    private setupDeps?;
    private readonly registry;
    constructor();
    setup(deps: HooksServiceSetupDeps): HooksServiceSetup;
    start(): HooksServiceStart;
}
