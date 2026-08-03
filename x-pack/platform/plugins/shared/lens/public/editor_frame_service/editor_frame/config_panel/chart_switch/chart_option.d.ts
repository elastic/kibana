import React from 'react';
import type { IconType } from '@elastic/eui';
export declare const ChartOption: ({ option, searchValue, }: {
    option: {
        label: string;
        description?: string;
        icon?: IconType;
    };
    searchValue?: string;
}) => React.JSX.Element;
export declare const getDataLossWarning: (dataLoss: "nothing" | "layers" | "everything" | "columns") => string | undefined;
export declare const ChartSwitchOptionPrepend: ({ isChecked, dataLoss, subtypeId, }: {
    isChecked: boolean;
    dataLoss: "nothing" | "layers" | "everything" | "columns";
    subtypeId: string;
}) => React.JSX.Element;
