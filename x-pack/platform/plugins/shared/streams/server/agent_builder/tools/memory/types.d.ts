import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { MemoryService } from '../../../lib/memory';
export interface MemoryToolsOptions {
    getMemoryService: () => MemoryService;
    getSecurity: () => SecurityServiceStart;
}
