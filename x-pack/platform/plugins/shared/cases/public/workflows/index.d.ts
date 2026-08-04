import type { CasesPublicSetupDependencies } from '../types';
import type { UnifiedAttachmentTypeRegistry } from '../client/attachment_framework/unified_attachment_registry';
export declare function registerCasesSteps(workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions'], unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry, isCasesAttachmentsEnabled: boolean): void;
export declare function registerCasesWorkflowTriggers(workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']): void;
