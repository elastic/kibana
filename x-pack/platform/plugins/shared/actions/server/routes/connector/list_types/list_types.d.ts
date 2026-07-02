import type { IRouter } from '@kbn/core/server';
import type { ActionsRequestHandlerContext } from '../../../types';
import type { ILicenseState } from '../../../lib';
export declare const listTypesRoute: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState) => void;
