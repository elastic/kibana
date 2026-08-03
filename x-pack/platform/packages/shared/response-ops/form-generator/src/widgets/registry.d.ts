import { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from './types';
import type { GetMetaFn, SetMetaFn } from '../meta_types';
interface MetaFunctionsParam {
    getMeta: GetMetaFn;
    setMeta: SetMetaFn;
}
export declare function getWidgetComponent(schema: z.ZodType, meta?: MetaFunctionsParam): React.FC<BaseWidgetProps<z.ZodType, unknown, unknown>>;
export {};
