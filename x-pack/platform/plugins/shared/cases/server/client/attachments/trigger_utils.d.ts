import type { Case } from '../../../common/types/domain';
import type { CasesClientArgs } from '..';
export declare function emitAttachmentsAddedEvent(clientArgs: CasesClientArgs, updatedCase: Case, attachmentIds: string[], attachmentType: string): void;
