import type { RequestHandler } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
type ActionsRequestHandlerWrapper = <P, Q, B>(licenseState: ILicenseState, handler: RequestHandler<P, Q, B, ActionsRequestHandlerContext>) => RequestHandler<P, Q, B, ActionsRequestHandlerContext>;
export declare const verifyAccessAndContext: ActionsRequestHandlerWrapper;
export {};
