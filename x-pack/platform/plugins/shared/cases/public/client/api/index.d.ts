import type { HttpStart } from '@kbn/core/public';
import type { CasesPublicStart } from '../../types';
export declare const createClientAPI: ({ http }: {
    http: HttpStart;
}) => CasesPublicStart["api"];
