import type { FC } from 'react';
interface Props {
    startDatafeed: boolean;
    setStartDatafeed(start: boolean): void;
    disabled?: boolean;
}
export declare const StartDatafeedSwitch: FC<Props>;
export {};
