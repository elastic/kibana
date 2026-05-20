import type { Logger } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
/**
 * If we are on Cloud we need to ensure that we have sufficient memory available,
 * if we do not Chromium cannot start. See {@link MIN_CLOUD_MEM_MB}.
 *
 */
export declare function systemHasInsufficientMemory(cloud: undefined | CloudSetup, logger: Logger): boolean;
