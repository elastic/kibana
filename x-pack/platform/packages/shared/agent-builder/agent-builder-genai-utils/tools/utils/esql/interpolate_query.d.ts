import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import { type WrappingPrettyPrinterOptions } from '@elastic/esql';
/**
 * Interpolates parameters into a templated ESQL query string.
 */
export declare const interpolateEsqlQuery: (template: string, params: Record<string, EsqlToolParamValue | null>, printOpts?: WrappingPrettyPrinterOptions) => string;
