import React from 'react';
interface Props {
    value: string;
    onChange: (value: string) => void;
    errors?: string;
    compressed?: boolean;
    minimumInterval?: string;
}
export declare const RuleSchedule: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLInputElement>>;
export {};
