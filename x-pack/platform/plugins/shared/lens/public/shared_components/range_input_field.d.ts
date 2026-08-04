import React from 'react';
type RangeInputFieldProps = Partial<{
    isInvalid: boolean;
    label: string;
    helpText: string;
    error: string;
    lowerValue: number | '';
    upperValue: number | '';
    onLowerValueChange: React.ChangeEventHandler<HTMLInputElement> | undefined;
    onUpperValueChange: React.ChangeEventHandler<HTMLInputElement> | undefined;
    onLowerValueBlur: React.FocusEventHandler<HTMLInputElement> | undefined;
    onUpperValueBlur: React.FocusEventHandler<HTMLInputElement> | undefined;
    testSubjLayout?: string;
    testSubjLower?: string;
    testSubjUpper?: string;
}>;
export declare function RangeInputField({ isInvalid, label, helpText, error, lowerValue, onLowerValueChange, onLowerValueBlur, upperValue, onUpperValueChange, onUpperValueBlur, testSubjLayout, testSubjLower, testSubjUpper, }: RangeInputFieldProps): React.JSX.Element;
export {};
