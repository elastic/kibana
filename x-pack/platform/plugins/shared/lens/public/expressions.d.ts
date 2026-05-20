import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { getDatatable } from '../common/expressions/defs/datatable/datatable';
import type { getTimeScale } from '../common/expressions/defs/time_scale/time_scale';
type TimeScaleArguments = Parameters<typeof getTimeScale>;
export declare const setupExpressions: (expressions: ExpressionsSetup, formatFactory: Parameters<typeof getDatatable>[0], getDatatableUtilities: TimeScaleArguments[0], getTimeZone: TimeScaleArguments[1], getForceNow: TimeScaleArguments[2]) => void;
export {};
