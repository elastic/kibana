import React from 'react';
import moment from 'moment';
interface Props {
    selectedDate: moment.Moment | null;
    onChangeSelectedDate: (date: moment.Moment | null) => void;
    filledStyle: boolean;
    onClick?: () => void;
    value?: string;
}
export declare const GoToDate: React.FunctionComponent<Props>;
export {};
