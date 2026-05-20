import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { SettingsConfig } from '../../../../../common/settings/types';
export declare const ZodSchemaType: {
    readonly object: "object";
    readonly number: "number";
    readonly string: "string";
    readonly enum: "enum";
    readonly boolean: "boolean";
};
export type ZodSchemaTypeName = (typeof ZodSchemaType)[keyof typeof ZodSchemaType];
export declare const convertValue: (value: string | boolean, type: ZodSchemaTypeName) => any;
export declare const validateSchema: (coercedSchema: z.ZodString, newValue: any) => string | undefined;
export declare const SettingsFieldWrapper: React.FC<{
    settingsConfig: SettingsConfig;
    typeName: ZodSchemaTypeName;
    renderItem: Function;
    disabled?: boolean;
}>;
export declare const getInnerType: (schema: z.ZodType<any, any>) => ZodSchemaTypeName | "";
