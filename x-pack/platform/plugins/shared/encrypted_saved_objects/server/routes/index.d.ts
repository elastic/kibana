import type { BuildFlavor } from '@kbn/config';
import type { IRouter, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ConfigType } from '../config';
import type { EncryptionKeyRotationService } from '../crypto';
/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
    router: IRouter;
    logger: Logger;
    config: ConfigType;
    encryptionKeyRotationService: PublicMethodsOf<EncryptionKeyRotationService>;
    buildFlavor: BuildFlavor;
}
export declare function defineRoutes(params: RouteDefinitionParams): void;
