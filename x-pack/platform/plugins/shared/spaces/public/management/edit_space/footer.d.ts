import React from 'react';
interface Props {
    isDirty: boolean;
    isLoading: boolean;
    onClickCancel: () => void;
    onClickSubmit: () => void;
    onClickDeleteSpace: () => void;
}
export declare const EditSpaceTabFooter: React.FC<Props>;
export {};
