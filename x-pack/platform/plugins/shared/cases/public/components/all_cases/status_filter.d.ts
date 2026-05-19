import React from 'react';
import { CaseStatuses } from '../../../common/types/domain';
interface Props {
    countClosedCases: number | null;
    countInProgressCases: number | null;
    countOpenCases: number | null;
    hiddenStatuses?: CaseStatuses[];
    onChange: (params: {
        filterId: string;
        selectedOptionKeys: string[];
    }) => void;
    selectedOptionKeys: string[];
}
export declare const StatusFilterComponent: {
    ({ countClosedCases, countInProgressCases, countOpenCases, hiddenStatuses, onChange, selectedOptionKeys, }: Props): React.JSX.Element;
    displayName: string;
};
export declare const StatusFilter: React.MemoExoticComponent<{
    ({ countClosedCases, countInProgressCases, countOpenCases, hiddenStatuses, onChange, selectedOptionKeys, }: Props): React.JSX.Element;
    displayName: string;
}>;
export {};
