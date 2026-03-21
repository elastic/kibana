import type { ToolHandlerFn } from '@kbn/agent-builder-server';
import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import { type EsqlToolConfig } from '@kbn/agent-builder-common';
/**
 * Resolves parameter values by applying defaults for missing parameters.
 * @param paramDefinitions - The parameter definitions from the tool configuration
 * @param providedParams - The parameters provided by the LLM
 * @returns Resolved parameters with defaults applied
 */
export declare const resolveToolParameters: (paramDefinitions: EsqlToolConfig["params"], providedParams: Record<string, EsqlToolParamValue>) => Record<string, EsqlToolParamValue | null>;
export declare const createHandler: (configuration: EsqlToolConfig) => ToolHandlerFn<Record<string, unknown>>;
