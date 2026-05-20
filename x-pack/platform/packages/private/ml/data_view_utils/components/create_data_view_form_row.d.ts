import React, { type FC } from 'react';
interface CreateDataViewFormProps {
    canCreateDataView: boolean;
    createDataView: boolean;
    dataViewTitleExists: boolean;
    setCreateDataView: (d: boolean) => void;
    dataViewAvailableTimeFields: string[];
    dataViewTimeField: string | undefined;
    onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}
export declare const CreateDataViewForm: FC<CreateDataViewFormProps>;
export {};
