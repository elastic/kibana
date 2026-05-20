import type { FC } from 'react';
import React from 'react';
import type { InferrerType } from '.';
export declare const TextInput: FC<{
    placeholder?: string;
    inferrer: InferrerType;
}>;
export declare const getGeneralInputComponent: (inferrer: InferrerType, placeholder?: string) => React.JSX.Element;
