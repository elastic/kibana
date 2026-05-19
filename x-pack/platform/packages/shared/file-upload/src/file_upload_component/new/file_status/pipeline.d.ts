import type { FC } from 'react';
import type { IngestPipeline as IngestPipelineType } from '@kbn/file-upload-common';
interface Props {
    pipeline: IngestPipelineType;
    setPipeline?: (pipeline: string) => void;
    readonly?: boolean;
    showTitle?: boolean;
    showBorder?: boolean;
}
export declare const IngestPipeline: FC<Props>;
export {};
