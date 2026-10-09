/**
 * Validates a single BYMONTHDAY value where 1 to 31 counts forward from the start of the month and
 * -1 is the last day of it. RFC 5545 also allows -31 to -2, but the recurring schedule form cannot
 * express those, so accepting them would let API clients store schedules the edit UI silently
 * rewrites.
 */
export declare const validateMonthDay: (value: number, fieldName: string) => string | undefined;
