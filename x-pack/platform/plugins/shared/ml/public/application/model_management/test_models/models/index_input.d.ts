import type { FC } from 'react';
import React from 'react';
import type { InferrerType } from '.';
interface Props {
    inferrer: InferrerType;
    data: ReturnType<typeof useIndexInput>;
    disableIndexSelection: boolean;
}
export declare const InferenceInputFormIndexControls: FC<Props>;
export declare function useIndexInput({ inferrer, defaultSelectedDataViewId, }: {
    inferrer: InferrerType;
    defaultSelectedDataViewId?: string;
}): {
    fieldNames: {
        value: string;
        text: string;
    }[];
    dataViewListItems: {
        value: string;
        text: string;
    }[];
    reloadExamples: () => void;
    selectedDataViewId: string | undefined;
    setSelectedDataViewId: React.Dispatch<React.SetStateAction<string | undefined>>;
    selectedField: string;
    setSelectedField: (fieldName: string) => void;
    setDataViewListItems: React.Dispatch<React.SetStateAction<{
        value: string;
        text: string;
    }[]>>;
};
export {};
