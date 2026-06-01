import * as t from 'io-ts';
declare const repairParamsSchema: t.TypeC<{
    body: t.TypeC<{
        list: t.ArrayC<t.Type<string, string, unknown>>;
    }>;
}>;
type RepairParams = t.TypeOf<typeof repairParamsSchema.props.body>;
interface RepairAction {
    type: 'recreate-transform' | 'start-transform' | 'stop-transform' | 'noop';
    transformType?: 'rollup' | 'summary';
}
interface RepairActionResult {
    action: RepairAction;
    status: 'success' | 'failure';
    error?: unknown;
}
interface RepairActionsGroupResult {
    id: string;
    results: RepairActionResult[];
}
export { repairParamsSchema };
export type { RepairParams, RepairAction, RepairActionResult, RepairActionsGroupResult };
