import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { UserPickerFieldSchema, ConditionRenderProps } from '../../../../../../common/types/domain/template/fields';
type UserPickerProps = z.infer<typeof UserPickerFieldSchema> & ConditionRenderProps;
export declare const UserPicker: React.FC<UserPickerProps>;
export {};
