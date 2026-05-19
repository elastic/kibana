import React from 'react';
export declare const PreferenceFormattedDate: React.NamedExoticComponent<{
    dateFormat?: string;
    value: Date;
    stripMs?: boolean;
}>;
export declare const PreferenceFormattedDateFromPrimitive: {
    ({ value, }: {
        value?: string | number | null;
    }): React.JSX.Element;
    displayName: string;
};
/**
 * This function may be passed to `Array.find()` to locate the `P1DT`
 * configuration (sub) setting, a string array that contains two entries
 * like the following example: `['P1DT', 'YYYY-MM-DD']`.
 */
export declare const isP1DTFormatterSetting: (formatNameFormatterPair?: string[]) => boolean;
/**
 * Renders a date in `P1DT` format, e.g. `YYYY-MM-DD`, as specified by
 * the `P1DT1` entry in the `dateFormat:scaled` Kibana Advanced setting.
 *
 * If the `P1DT` format is not specified in the `dateFormat:scaled` setting,
 * the fallback format `YYYY-MM-DD` will be applied
 */
export declare const PreferenceFormattedP1DTDate: React.NamedExoticComponent<{
    value: Date;
}>;
/**
 * Renders the specified date value in a format determined by the user's preferences,
 * with a tooltip that renders:
 * - the name of the field
 * - a humanized relative date (e.g. 16 minutes ago)
 * - a long representation of the date that includes the day of the week (e.g. Thursday, March 21, 2019 6:47pm)
 * - the raw date value (e.g. 2019-03-22T00:47:46Z)
 */
export declare const FormattedDate: React.NamedExoticComponent<{
    fieldName?: string;
    value?: string | number | null;
    className?: string;
}>;
/**
 * Renders the specified date value according to under/over one hour
 * Under an hour = relative format
 * Over an hour = in a format determined by the user's preferences,
 * with a tooltip that renders:
 * - the name of the field
 * - a humanized relative date (e.g. 16 minutes ago)
 * - a long representation of the date that includes the day of the week (e.g. Thursday, March 21, 2019 6:47pm)
 * - the raw date value (e.g. 2019-03-22T00:47:46Z)
 * @param value -  raw date
 * @param  stripMs - strip milliseconds when formatting time (remove ".SSS" from the date format)
 */
export declare const FormattedRelativePreferenceDate: {
    ({ value, stripMs, }: {
        value?: string | number | null;
        stripMs?: boolean;
    }): React.JSX.Element;
    displayName: string;
};
/**
 * Renders a preceding label according to under/over one hour
 */
export declare const FormattedRelativePreferenceLabel: {
    ({ value, preferenceLabel, relativeLabel, }: {
        value?: string | number | null;
        preferenceLabel?: string | null;
        relativeLabel?: string | null;
    }): React.JSX.Element | null;
    displayName: string;
};
