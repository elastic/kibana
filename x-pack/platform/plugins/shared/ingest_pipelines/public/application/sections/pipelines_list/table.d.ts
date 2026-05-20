import type { FunctionComponent } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import type { Pipeline } from '../../../../common/types';
export interface Props {
    pipelines: Pipeline[];
    onReloadClick: () => void;
    isLoading: boolean;
    onEditPipelineClick: (pipelineName: string) => void;
    onClonePipelineClick: (pipelineName: string) => void;
    onDeletePipelineClick: (pipelineName: Pipeline[]) => void;
    openFlyout: (pipelineName: string) => void;
}
export declare const deprecatedPipelineBadge: {
    badge: string;
    badgeTooltip: string;
};
interface FilterQueryParams {
    [key: string]: 'unset' | 'on' | 'off';
}
export declare function serializeFilterOptions(options: EuiSelectableOption[]): FilterQueryParams;
export declare function deserializeFilterOptions(options: FilterQueryParams): EuiSelectableOption[];
export declare const PipelineTable: FunctionComponent<Props>;
export {};
