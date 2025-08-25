import { z } from '@kbn/zod';

export interface OneChatToolWithClientCallback<Dependencies extends {}> {
  id: string;
  name: string;
  description: string;
  schema: z.ZodSchema;
  screenDescription: string;
  getPostToolClientActions: (dependencies: Dependencies) => any[];
  parameters: z.ZodObject<any, any, any, any, any>;
  tags: string[];
}
