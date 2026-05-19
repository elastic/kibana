import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../lib';
import type { ActionsRequestHandlerContext } from '../../../types';
export declare const getConnectorRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState) => void;
