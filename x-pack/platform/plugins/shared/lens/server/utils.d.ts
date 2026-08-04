import type { Assign } from 'utility-types';
import type { Props } from '@kbn/config-schema';
/**
 * Picks a subset of props from base schema definition
 *
 * TODO: move this to shared package, maybe `@kbn/config-schema`
 */
export declare function pickFromObjectSchema<T extends Props, K extends keyof T>(schema: T, keys: K[]): Assign<{}, Pick<T, K>>;
