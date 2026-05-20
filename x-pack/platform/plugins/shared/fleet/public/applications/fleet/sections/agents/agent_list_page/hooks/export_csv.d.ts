import type { Agent } from '../../../../../../../common';
import type { ExportField } from '../../components/agent_export_csv_modal';
export declare function useExportCSV(): (agents: Agent[] | string, columns: ExportField[], sortOptions?: {
    field?: string;
    direction?: "asc" | "desc";
}) => Promise<import("@kbn/core/public").Toast>;
