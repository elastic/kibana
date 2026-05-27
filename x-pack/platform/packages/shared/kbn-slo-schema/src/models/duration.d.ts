import * as moment from 'moment';
declare enum DurationUnit {
    'Minute' = "m",
    'Hour' = "h",
    'Day' = "d",
    'Week' = "w",
    'Month' = "M"
}
declare class Duration {
    readonly value: number;
    readonly unit: DurationUnit;
    constructor(value: number, unit: DurationUnit);
    add(other: Duration): Duration;
    isShorterThan(other: Duration): boolean;
    isLongerOrEqualThan(other: Duration): boolean;
    isEqual(other: Duration): boolean;
    format(): string;
    asSeconds(): number;
    asMinutes(): number;
}
declare const toDurationUnit: (unit: string) => DurationUnit;
declare const toMomentUnitOfTime: (unit: DurationUnit) => moment.unitOfTime.Diff;
export { Duration, DurationUnit, toMomentUnitOfTime, toDurationUnit };
