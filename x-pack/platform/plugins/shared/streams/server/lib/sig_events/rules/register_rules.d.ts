import type { Logger } from '@kbn/core/server';
import type { StreamsPluginSetupDependencies } from '../../../types';
interface Props {
    plugins: StreamsPluginSetupDependencies;
    logger: Logger;
}
export declare function registerRules({ plugins, logger }: Props): void;
export {};
