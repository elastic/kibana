import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ProductDocBaseConfig } from './config';
import type { ProductDocBaseSetupContract, ProductDocBaseStartContract, ProductDocBaseSetupDependencies, ProductDocBaseStartDependencies } from './types';
export declare class ProductDocBasePlugin implements Plugin<ProductDocBaseSetupContract, ProductDocBaseStartContract, ProductDocBaseSetupDependencies, ProductDocBaseStartDependencies> {
    private readonly context;
    private logger;
    private internalServices?;
    constructor(context: PluginInitializerContext<ProductDocBaseConfig>);
    setup(coreSetup: CoreSetup<ProductDocBaseStartDependencies, ProductDocBaseStartContract>, { taskManager }: ProductDocBaseSetupDependencies): ProductDocBaseSetupContract;
    start(core: CoreStart, { licensing, taskManager }: ProductDocBaseStartDependencies): ProductDocBaseStartContract;
}
