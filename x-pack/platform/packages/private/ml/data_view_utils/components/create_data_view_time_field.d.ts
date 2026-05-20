import React, { type FC } from 'react';
interface CreateDataViewTimeFieldProps {
    dataViewAvailableTimeFields: string[];
    dataViewTimeField: string | undefined;
    onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}
export declare const CreateDataViewTimeField: FC<CreateDataViewTimeFieldProps>;
export {};
