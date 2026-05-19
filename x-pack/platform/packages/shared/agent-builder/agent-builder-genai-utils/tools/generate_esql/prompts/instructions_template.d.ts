export interface InstructionsTemplateParams {
    /**
     * The default LIMIT to use when no specific limit is requested by the user.
     */
    defaultLimit?: number;
    /**
     * If true, omits the instruction to use named parameters (?_tstart, ?_tend)
     * for time range filtering.
     */
    disableNamedParams?: boolean;
}
/**
 * Generates ES|QL query generation instructions with configurable limit values.
 * This is a copy of the instructions from the inference plugin, modified to support
 * custom row limits for Agent Builder's index search tool.
 */
export declare const getEsqlInstructions: (params?: InstructionsTemplateParams) => string;
