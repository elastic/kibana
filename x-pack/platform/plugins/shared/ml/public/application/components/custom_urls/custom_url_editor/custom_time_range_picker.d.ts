import type { FC } from 'react';
import { type Moment } from 'moment';
interface CustomUrlTimeRangePickerProps {
    onCustomTimeRangeChange: (customTimeRange?: {
        start: Moment;
        end: Moment;
    }) => void;
    customTimeRange?: {
        start: Moment;
        end: Moment;
    };
    disabled: boolean;
}
export declare const CustomTimeRangePicker: FC<CustomUrlTimeRangePickerProps>;
export {};
