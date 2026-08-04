import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { FieldSchema, ConditionRenderProps } from '../../../../common/types/domain/template/fields';
export type FieldMap = {
    [K in FieldType]: FC<Extract<z.infer<typeof FieldSchema>, {
        control: K;
    }> & ConditionRenderProps>;
};
export declare const controlRegistry: FieldMap;
