import type { FunctionComponent } from 'react';
import type { Error } from '../../../../shared_imports';
interface Props {
    pipelineName: string;
    error: Error;
    displayWarning: boolean;
    onCreatePipeline: () => void;
}
export declare const NotFoundPanel: FunctionComponent<Props>;
export {};
