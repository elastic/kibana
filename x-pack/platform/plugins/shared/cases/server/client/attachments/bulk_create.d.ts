import type { Case } from '../../../common/types/domain';
import type { CasesClientArgs } from '..';
import type { BulkCreateArgs } from './types';
export declare const bulkCreate: (args: BulkCreateArgs, clientArgs: CasesClientArgs) => Promise<Case>;
