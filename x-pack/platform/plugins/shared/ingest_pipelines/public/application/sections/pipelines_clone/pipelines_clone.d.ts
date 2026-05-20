import type { FunctionComponent } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
export interface ParamProps {
    sourceName: string;
}
/**
 * This section is a wrapper around the create section where we receive a pipeline name
 * to load and set as the source pipeline for the {@link PipelinesCreate} form.
 */
export declare const PipelinesClone: FunctionComponent<RouteComponentProps<ParamProps>>;
