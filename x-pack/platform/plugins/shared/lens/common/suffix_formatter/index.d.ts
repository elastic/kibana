import type { FieldFormatInstanceType } from '@kbn/field-formats-plugin/common';
import type { TimeScaleUnit } from '@kbn/lens-common';
import type { FormatFactory } from '../types';
export declare const unitSuffixesLong: Record<TimeScaleUnit, string>;
export declare const suffixFormatterId = "suffix";
export declare function getSuffixFormatter(getFormatFactory: () => FormatFactory): FieldFormatInstanceType;
