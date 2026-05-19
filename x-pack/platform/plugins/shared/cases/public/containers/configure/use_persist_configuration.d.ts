import type { ServerError } from '../../types';
import type { SnakeToCamelCase } from '../../../common/types';
import type { ConfigurationRequest } from '../../../common/types/api';
type Request = Omit<SnakeToCamelCase<ConfigurationRequest>, 'owner'> & {
    id: string;
    version: string;
};
export declare const usePersistConfiguration: () => import("@kbn/react-query").UseMutationResult<import("../types").CasesConfigurationUI, ServerError, Request, unknown>;
export type UsePersistConfiguration = ReturnType<typeof usePersistConfiguration>;
export {};
