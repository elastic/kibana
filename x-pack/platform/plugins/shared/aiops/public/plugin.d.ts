import type { CoreStart, Plugin } from '@kbn/core/public';
import type { AiopsPluginSetup, AiopsPluginSetupDeps, AiopsPluginStart, AiopsPluginStartDeps, AiopsCoreSetup } from './types';
export declare class AiopsPlugin implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps> {
    setup(core: AiopsCoreSetup, { embeddable, cases, uiActions }: AiopsPluginSetupDeps): void;
    start(core: CoreStart, plugins: AiopsPluginStartDeps): AiopsPluginStart;
    stop(): void;
}
