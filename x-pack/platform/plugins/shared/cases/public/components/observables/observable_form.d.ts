import React, { type FC } from 'react';
import type { ObservablePatch, ObservablePost } from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
export interface ObservableFormFieldsProps {
    observable?: Observable;
}
export declare const ObservableFormFields: React.MemoExoticComponent<({ observable }: ObservableFormFieldsProps) => React.JSX.Element>;
export interface ObservableFormProps {
    isLoading: boolean;
    onSubmit: (observable: ObservablePatch | ObservablePost) => Promise<void>;
    observable?: Observable;
    onCancel: VoidFunction;
}
export declare const ObservableForm: FC<ObservableFormProps>;
