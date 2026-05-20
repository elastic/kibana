import moment from 'moment';
export declare function useScheduleDateTime(now?: string): {
    startDatetime: moment.Moment;
    initialDatetime: moment.Moment;
    onChangeStartDateTime: (date: moment.Moment | null) => void;
    minTime: moment.Moment | undefined;
    maxTime: moment.Moment | undefined;
};
