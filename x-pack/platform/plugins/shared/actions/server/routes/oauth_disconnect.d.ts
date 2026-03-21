import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
export declare const oauthDisconnectRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState, logger: Logger, coreSetup: CoreSetup<ActionsPluginsStart>) => void;
