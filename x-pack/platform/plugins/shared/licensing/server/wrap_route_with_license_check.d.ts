import type { RequestHandler } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { LicensingRequestHandlerContext } from './types';
export type CheckLicense = (license: ILicense) => {
    valid: false;
    message: string;
} | {
    valid: true;
    message: null;
};
export declare function wrapRouteWithLicenseCheck<P, Q, B, Context extends LicensingRequestHandlerContext>(checkLicense: CheckLicense, handler: RequestHandler<P, Q, B, Context>): RequestHandler<P, Q, B, Context>;
