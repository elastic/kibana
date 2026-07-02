import type { IRouter } from '@kbn/core/server';
import type { ActionsRequestHandlerContext } from '../../../types';
import type { ILicenseState } from '../../../lib';
export declare const getAllConnectorsRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState) => void;
