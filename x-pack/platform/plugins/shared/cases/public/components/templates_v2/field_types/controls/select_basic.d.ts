import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { SelectBasicFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type SelectBasicProps = z.infer<typeof SelectBasicFieldSchema> & ConditionRenderProps;
export declare const SelectBasic: {
    ({ label, metadata, name, type, isRequired }: SelectBasicProps): React.JSX.Element;
    displayName: string;
};
export {};
