import { z } from '@kbn/zod/v4';
export interface WorkflowAttachmentSchemaEntry {
    id: string;
    schema?: z.ZodType;
    workflowSchema?: z.ZodObject | false;
}
export declare const selectWorkflowAttachmentSchemas: (attachments: WorkflowAttachmentSchemaEntry[]) => z.ZodObject[];
