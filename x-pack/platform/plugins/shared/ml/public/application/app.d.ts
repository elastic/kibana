import { type FC } from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ExperimentalFeatures, MlFeatures, NLPSettings } from '../../common/constants/app';
import type { MlSetupDependencies, MlStartDependencies } from '../plugin';
import { getMlGlobalServices } from './util/get_services';
import type { ManagementSectionId } from './management';
export type MlDependencies = Omit<MlSetupDependencies, 'share' | 'fieldFormats' | 'maps' | 'cases' | 'licensing' | 'uiActions'> & MlStartDependencies;
interface AppProps {
    coreStart: CoreStart;
    deps: MlDependencies;
    appMountParams: ManagementAppMountParams | AppMountParameters;
    isServerless: boolean;
    mlFeatures: MlFeatures;
    experimentalFeatures: ExperimentalFeatures;
    nlpSettings: NLPSettings;
    entryPoint?: ManagementSectionId;
}
export interface MlServicesContext {
    mlServices: MlGlobalServices;
}
export type MlGlobalServices = ReturnType<typeof getMlGlobalServices>;
export declare const App: FC<AppProps>;
export declare const renderApp: (coreStart: CoreStart, deps: MlDependencies, appMountParams: AppMountParameters, isServerless: boolean, mlFeatures: MlFeatures, experimentalFeatures: ExperimentalFeatures, nlpSettings: NLPSettings) => () => void;
export {};
