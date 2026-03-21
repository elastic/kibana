import { validateQuery } from '@kbn/esql-language';
import type { ValidationOptions } from '@kbn/esql-language';
export type ValidateEsqlQueryCallbacks = Parameters<typeof validateQuery>[1];
export declare const validateEsqlQuery: (query: string, callbacks?: ValidateEsqlQueryCallbacks, options?: ValidationOptions) => Promise<string | undefined>;
